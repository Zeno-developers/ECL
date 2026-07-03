<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class UploadController extends BaseController
{
    public function upload(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            // Check if file was uploaded
            if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No file uploaded'
                ], 400);
            }

            $file = $_FILES['file'];
            
            // Validate upload
            $maxSize = getenv('UPLOAD_MAX_SIZE') ?: 104857600; // 100MB default
            if ($file['size'] > $maxSize) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'File size exceeds maximum allowed'
                ], 400);
            }
            
            $defaultAllowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'm4a'];
            $envAllowedTypes = array_filter(array_map(
                fn($type) => strtolower(trim($type)),
                explode(',', getenv('UPLOAD_ALLOWED_TYPES') ?: '')
            ));
            $allowedTypes = array_values(array_unique(array_merge($defaultAllowedTypes, $envAllowedTypes)));

            // Read actual MIME from file magic bytes — the declared extension is never trusted
            $actualMime = strtolower((string)(@mime_content_type($file['tmp_name']) ?: ''));
            $mimeAllowed = [
                'image/jpeg'      => 'jpg',
                'image/png'       => 'png',
                'image/gif'       => 'gif',
                'image/webp'      => 'webp',
                'application/pdf' => 'pdf',
                'video/mp4'       => 'mp4',
                'video/quicktime' => 'mov',
                'video/x-msvideo' => 'avi',
                'video/webm'      => 'webm',
                'audio/mpeg'      => 'mp3',
                'audio/wav'       => 'wav',
                'audio/x-wav'     => 'wav',
                'audio/mp4'       => 'm4a',
                'audio/aac'       => 'm4a',
                'audio/ogg'       => 'ogg',
            ];

            // Allow only if the actual content type is recognized AND that type is permitted
            $safeExt = $mimeAllowed[$actualMime] ?? null;
            if ($safeExt === null || !in_array($safeExt, $allowedTypes, true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'File type not allowed'
                ], 400);
            }

            // Generate unique filename using the content-derived extension, not the user-supplied one
            $uploadDir = $this->getUploadDirectory();
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $filename = uniqid() . '_' . time() . '.' . $safeExt;
            $filepath = $uploadDir . $filename;
            
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Failed to move uploaded file'
                ], 500);
            }

            $fileSize = filesize($filepath);
            $mimeType = $actualMime;
            
            // Save to database
            $fileId = $this->db->insert('uploaded_files', [
                'filename' => $filename,
                'original_name' => $file['name'],
                'file_path' => 'uploads/' . $filename,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'uploaded_by' => $userId
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'File uploaded successfully',
                'data' => [
                    'file_id' => $fileId,
                    'filename' => $filename,
                    'original_name' => $file['name'],
                    'file_path' => 'uploads/' . $filename,
                    'file_size' => $fileSize,
                    'mime_type' => $mimeType,
                    'url' => '/uploads/' . $filename
                ]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $fileId = $args['id'];
            
            $file = $this->db->first(
                "SELECT * FROM uploaded_files WHERE id = ? AND uploaded_by = ?",
                [$fileId, $userId]
            );
            
            if (!$file) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'File not found or you do not have permission to delete it'
                ], 404);
            }
            
            // Delete physical file
            $fullPath = $this->resolveUploadFilePath($file['file_path'] ?? '');
            if ($fullPath && file_exists($fullPath)) {
                unlink($fullPath);
            }
            
            $this->db->delete('uploaded_files', 'id = ?', [$fileId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'File deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete file: ' . $e->getMessage()
            ], 500);
        }
    }
}

