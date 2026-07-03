<?php

namespace App\Controller;

use App\Service\MemberFollowUpEmailService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Exception;

class FollowUpController extends BaseController
{
    private const ALLOWED_ROLES = ['admin', 'pastor', 'superadmin', 'elder', 'zone_leader', 'cell_leader'];
    private MemberFollowUpEmailService $service;

    public function __construct()
    {
        parent::__construct();
        $this->service = new MemberFollowUpEmailService($this->db);
    }

    public function getSummary(Request $request, Response $response): Response
    {
        try {
            $viewer = $this->getViewer($request);
            if (!$viewer) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $this->service->getOverview($viewer),
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load follow-up summary: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getMembers(Request $request, Response $response): Response
    {
        try {
            $viewer = $this->getViewer($request);
            if (!$viewer) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $params = $request->getQueryParams();
            $search = trim((string)($params['q'] ?? $params['search'] ?? ''));
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);

            $result = $this->service->getMembers($viewer, $search, $page, $limit);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load follow-up members: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getEmails(Request $request, Response $response): Response
    {
        try {
            $viewer = $this->getViewer($request);
            if (!$viewer) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $params = $request->getQueryParams();
            $memberId = (int)($params['member_id'] ?? 0);
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 15);

            if ($memberId <= 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'member_id is required',
                ], 400);
            }

            $member = $this->service->getMemberByIdForViewer($memberId, $viewer);
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found or access denied',
                ], 404);
            }

            $history = $this->service->getMemberEmailHistory($memberId, $page, $limit);
            $summary = $this->service->getOverview($viewer);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'member' => $member,
                    'emails' => $history['emails'],
                    'pagination' => $history['pagination'],
                    'summary' => $summary,
                ],
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load email history: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function sendEmail(Request $request, Response $response): Response
    {
        try {
            $viewer = $this->getViewer($request);
            if (!$viewer) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data = json_decode((string)$request->getBody(), true) ?: [];
            $required = ['member_id', 'subject', 'message'];
            $errors = $this->validateRequired($data, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 400);
            }

            $memberId = (int)$data['member_id'];
            $member = $this->service->getMemberByIdForViewer($memberId, $viewer);
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found or access denied',
                ], 404);
            }

            $result = $this->service->sendMemberEmail(
                $member,
                $this->sanitizeString((string)$data['subject']),
                (string)$data['message'],
                (int)($this->getUserId($request) ?? 0),
                [
                    'source' => 'manual_follow_up',
                    'email_type' => 'follow_up',
                    'recipient_type' => 'member',
                    'related_absence_flag_id' => isset($data['related_absence_flag_id']) ? (int)$data['related_absence_flag_id'] : null,
                    'related_follow_up_note_id' => isset($data['related_follow_up_note_id']) ? (int)$data['related_follow_up_note_id'] : null,
                ]
            );

            return $this->jsonResponse([
                'status' => $result['success'] ? 'success' : 'error',
                'message' => $result['message'],
                'data' => $result,
            ], $result['success'] ? 200 : 500);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to send follow-up email: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function getViewer(Request $request): ?array
    {
        $userId = $this->getUserId($request);
        if (!$userId) {
            return null;
        }

        $viewer = $this->db->first(
            "SELECT id, role, zone_id, cell_id, first_name, last_name, email
             FROM users
             WHERE id = ? AND is_active = 1",
            [$userId]
        ) ?: null;

        if (!$viewer || !in_array((string)($viewer['role'] ?? ''), self::ALLOWED_ROLES, true)) {
            return null;
        }

        return $viewer;
    }
}
