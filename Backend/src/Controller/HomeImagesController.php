<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class HomeImagesController extends BaseController
{
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $where = '';
            $paramsArray = [];
            
            if (isset($params['section'])) {
                $where = 'section = ?';
                $paramsArray[] = $params['section'];
            }
            
            if (isset($params['category'])) {
                $where = $where ? $where . ' AND category = ?' : 'category = ?';
                $paramsArray[] = $params['category'];
            }
            
            $result = $this->paginate('home_images', $page, $limit, $where, $paramsArray);
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImagesBySection(Request $request, Response $response, array $args): Response
    {
        try {
            $section = $args['section'];
            $params = $request->getQueryParams();
            $category = $params['category'] ?? null;
            
            $sql = "SELECT * FROM home_images WHERE section = ?";
            $paramsArray = [$section];
            
            if ($category) {
                $sql .= " AND category = ?";
                $paramsArray[] = $category;
            }
            
            $images = $this->db->all($sql, $paramsArray);
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $images
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getFeaturedImages(Request $request, Response $response, array $args): Response
    {
        try {
            $section = $args['section'];
            $images = $this->db->all(
                "SELECT * FROM home_images WHERE section = ? AND is_featured = 1 ORDER BY display_order ASC",
                [$section]
            );
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $images
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch featured images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImagesByComponent(Request $request, Response $response, array $args): Response
    {
        try {
            $component = $args['component'];
            $images = $this->db->all(
                "SELECT * FROM home_images WHERE component = ? AND is_active = 1 ORDER BY display_order ASC",
                [$component]
            );
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $images
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch images: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImageById(Request $request, Response $response, array $args): Response
    {
        try {
            $image = $this->db->first("SELECT * FROM home_images WHERE id = ?", [$args['id']]);
            
            if (!$image) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Image not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $image
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function upload(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            if (!isset($_FILES['image']) && !isset($_FILES['file'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No file uploaded'
                ], 400);
            }
            
            $file = $_FILES['image'] ?? $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Upload error occurred'
                ], 400);
            }
            
            // Validate image
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            if (!in_array($file['type'], $allowedTypes)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only JPEG, PNG, GIF, and WebP images are allowed'
                ], 400);
            }
            
            // Allow larger uploads to support full-HD images (up to 30MB)
            if ($file['size'] > 30 * 1024 * 1024) { // 30MB
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'File size must be less than 30MB'
                ], 400);
            }
            
            // Generate unique filename
            $uploadDir = $this->getUploadDirectory('home-images');
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $filename = uniqid() . '_' . time() . '.' . $fileExt;
            $filepath = $uploadDir . $filename;
            
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Failed to move uploaded file'
                ], 500);
            }
            
            // Get additional data from request
            $data = $request->getParsedBody();
            
            $imageData = [
                'title' => isset($data['title']) ? $this->sanitizeString($data['title']) : $file['name'],
                'description' => isset($data['description']) ? $this->sanitizeString($data['description']) : null,
                'section' => isset($data['section']) ? $this->sanitizeString($data['section']) : 'home',
                'category' => isset($data['category']) ? $this->sanitizeString($data['category']) : null,
                'component' => isset($data['component']) ? $this->sanitizeString($data['component']) : null,
                'image_url' => 'uploads/home-images/' . $filename,
                'thumbnail_url' => isset($data['thumbnail_url']) ? $this->sanitizeString($data['thumbnail_url']) : null,
                'alt_text' => isset($data['alt_text']) ? $this->sanitizeString($data['alt_text']) : null,
                'link_url' => isset($data['link_url']) ? $this->sanitizeString($data['link_url']) : null,
                'display_order' => isset($data['display_order']) ? (int)$data['display_order'] : 0,
                'is_featured' => isset($data['is_featured']) ? (bool)$data['is_featured'] : 0,
                'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : 1,
                'uploaded_by' => $userId
            ];
            
            $imageId = $this->db->insert('home_images', $imageData);
            $image = $this->db->first("SELECT * FROM home_images WHERE id = ?", [$imageId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Image uploaded successfully',
                'data' => $image
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $imageId = $args['id'];
            
            $allowedFields = [
                'title', 'description', 'section', 'category', 'component',
                'alt_text', 'link_url', 'display_order', 'is_featured', 'is_active'
            ];
            
            $updateData = [];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if (in_array($field, ['is_featured', 'is_active', 'display_order'])) {
                        $updateData[$field] = (int)$data[$field];
                    } else {
                        $updateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                    }
                }
            }

            if (empty($updateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
            $this->db->query(
                "UPDATE home_images SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                array_merge(array_values($updateData), [$imageId])
            );

            $image = $this->db->first("SELECT * FROM home_images WHERE id = ?", [$imageId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Image updated successfully',
                'data' => $image
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $imageId = $args['id'];
            $image = $this->db->first("SELECT * FROM home_images WHERE id = ?", [$imageId]);
            
            if (!$image) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Image not found'
                ], 404);
            }
            
            // Delete physical file
            $filepath = $this->resolveUploadFilePath($image['image_url'] ?? '');
            if ($filepath && file_exists($filepath)) {
                unlink($filepath);
            }
            
            $this->db->delete('home_images', 'id = ?', [$imageId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Image deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete image: ' . $e->getMessage()
            ], 500);
        }
    }

    public function bulkUpdate(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['imageIds']) || !isset($data['updates'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'imageIds and updates are required'
                ], 400);
            }
            
            $allowedUpdates = ['display_order', 'is_featured', 'is_active', 'section', 'category'];
            $updates = array_intersect_key($data['updates'], array_flip($allowedUpdates));
            
            if (empty($updates)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No valid fields to update'
                ], 400);
            }
            
            $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updates)));
            $placeholders = implode(', ', array_fill(0, count($data['imageIds']), '?'));
            
            $this->db->query(
                "UPDATE home_images SET $setClause WHERE id IN ($placeholders)",
                array_merge(array_values($updates), $data['imageIds'])
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Images updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Bulk update failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function bulkDelete(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['imageIds']) || !is_array($data['imageIds'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'imageIds array is required'
                ], 400);
            }
            
            $placeholders = implode(', ', array_fill(0, count($data['imageIds']), '?'));
            $this->db->query("DELETE FROM home_images WHERE id IN ($placeholders)", $data['imageIds']);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Images deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Bulk delete failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reorder(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['section']) || !isset($data['imageOrders']) || !is_array($data['imageOrders'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'section and imageOrders are required'
                ], 400);
            }
            
            foreach ($data['imageOrders'] as $imageId => $order) {
                $this->db->query(
                    "UPDATE home_images SET display_order = ? WHERE id = ? AND section = ?",
                    [(int)$order, $imageId, $data['section']]
                );
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Images reordered successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Reorder failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImageAnalytics(Request $request, Response $response, array $args): Response
    {
        try {
            $imageId = $args['id'];
            // Placeholder - implement actual analytics tracking
            $analytics = [
                'image_id' => $imageId,
                'views' => rand(0, 1000),
                'clicks' => rand(0, 100),
                'last_viewed' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $analytics
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getImageStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_images' => $this->db->first("SELECT COUNT(*) as count FROM home_images")['count'],
                'by_section' => $this->db->all("SELECT section, COUNT(*) as count FROM home_images GROUP BY section"),
                'by_component' => $this->db->all("SELECT component, COUNT(*) as count FROM home_images WHERE component IS NOT NULL GROUP BY component"),
                'featured_count' => $this->db->first("SELECT COUNT(*) as count FROM home_images WHERE is_featured = 1")['count']
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get stats: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUploadConfig(Request $request, Response $response): Response
    {
        try {
            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'max_file_size' => 31457280, // 30MB
                    'allowed_types' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    'upload_url' => '/api/home-images/upload',
                    'thumbnail_sizes' => [
                        'small' => ['width' => 300, 'height' => 200],
                        'medium' => ['width' => 600, 'height' => 400],
                        'large' => ['width' => 1200, 'height' => 800]
                    ]
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get upload config: ' . $e->getMessage()
            ], 500);
        }
    }
}

