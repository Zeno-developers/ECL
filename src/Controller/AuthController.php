<?php

namespace App\Controller;

use App\Database;
use App\Services\JwtService;
use App\Services\MailService;
use App\Services\LoggerService;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

class AuthController extends BaseController
{
    private $jwtService;
    private $mailService;
    private $smsService;

    public function __construct()
    {
        parent::__construct();
        $this->jwtService  = new JwtService();
        $this->mailService = new MailService();
        $this->smsService  = new \App\Services\WhatsAppService();
    }

    public function login(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);

            $identifier = trim($data['email'] ?? $data['phone'] ?? '');
            $password   = $data['password'] ?? '';

            if (!$identifier || !$password) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Email/phone and password are required'
                ], 400);
            }

            // Normalise SA phone: leading 0 → +27, strip spaces/dashes
            $isPhone = !str_contains($identifier, '@');
            if ($isPhone) {
                $phone = preg_replace('/[\s\-()]/', '', $identifier);
                if (str_starts_with($phone, '0')) {
                    $phone = '+27' . substr($phone, 1);
                } elseif (str_starts_with($phone, '27') && !str_starts_with($phone, '+')) {
                    $phone = '+' . $phone;
                }
                $user = $this->db->first(
                    "SELECT * FROM users WHERE phone = ? AND is_active = 1",
                    [$phone]
                );
                // Also try original input in case stored without country code
                if (!$user) {
                    $user = $this->db->first(
                        "SELECT * FROM users WHERE phone = ? AND is_active = 1",
                        [$identifier]
                    );
                }
            } else {
                $email = filter_var($identifier, FILTER_SANITIZE_EMAIL);
                $user  = $this->db->first(
                    "SELECT * FROM users WHERE email = ? AND is_active = 1",
                    [$email]
                );
            }

            if (!$user || !password_verify($password, $user['password'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid credentials'
                ], 401);
            }

            // Update last login
            $this->db->query(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                [$user['id']]
            );

            // Generate tokens
            $token = $this->jwtService->generateToken([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'zone_id' => $user['zone_id'] ?? null,
                'cell_id' => $user['cell_id'] ?? null
            ]);

            $refreshToken = $this->jwtService->generateRefreshToken([
                'user_id' => $user['id'],
                'email' => $user['email']
            ]);

            // Get member_id if user is a member
            $member = $this->db->first("SELECT id FROM members WHERE user_id = ?", [$user['id']]);

            // Remove password from response
            unset($user['password']);
            unset($user['reset_token']);
            unset($user['verification_token']);
            $user['mustChangePassword'] = (bool)($user['must_change_password'] ?? false);
            $user['memberId'] = $member ? $member['id'] : null;

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Login successful',
                'token' => $token,
                'refresh_token' => $refreshToken,
                'user' => $user
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Login failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function register(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            if (!is_array($data)) {
                $data = [];
            }
            
            $required = ['email', 'password', 'first_name', 'last_name', 'phone'];
            $errors = $this->validateRequired($data, $required);

            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);

            // Normalise phone to +27 format
            $rawPhone = preg_replace('/[\s\-()]/', '', $data['phone']);
            if (str_starts_with($rawPhone, '0')) {
                $rawPhone = '+27' . substr($rawPhone, 1);
            } elseif (str_starts_with($rawPhone, '27') && !str_starts_with($rawPhone, '+')) {
                $rawPhone = '+' . $rawPhone;
            }

            $allowedRoles = ['member','admin','pastor','superadmin','zone_leader','cell_leader','elder','deacon','volunteer','developer','usher'];
            $normalizedRole = isset($data['role']) && in_array($data['role'], $allowedRoles, true) ? $data['role'] : 'member';

            // Check duplicates
            $existing = $this->db->first("SELECT id FROM users WHERE email = ?", [$email]);
            if ($existing) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Email already registered'], 409);
            }
            $existingPhone = $this->db->first("SELECT id FROM users WHERE phone = ?", [$rawPhone]);
            if ($existingPhone) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'This phone number is already registered to an account'], 409);
            }

            // Generate 6-digit PIN
            $pin     = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $pinExp  = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            // Hash password
            $hashedPassword    = password_hash($data['password'], PASSWORD_DEFAULT);
            $verificationToken = bin2hex(random_bytes(32));

            $userId = $this->db->insert('users', [
                'uuid'              => $this->generateUuid(),
                'email'             => $email,
                'password'          => $hashedPassword,
                'first_name'        => $this->sanitizeString($data['first_name']),
                'last_name'         => $this->sanitizeString($data['last_name']),
                'phone'             => $rawPhone,
                'role'              => $normalizedRole,
                'verification_token'=> $verificationToken,
                'phone_pin'         => $pin,
                'phone_pin_expires' => $pinExp,
                'phone_verified'    => 0,
                'must_change_password' => 0,
                'is_active'         => 0,   // inactive until PIN verified
            ]);

            // Create member record. Compute next member_number from existing members
            // to avoid duplicate member numbers if user rows were deleted or ids reused.
            $maxRow = $this->db->first("SELECT MAX(CAST(SUBSTRING(member_number, 2) AS UNSIGNED)) AS maxnum FROM members");
            $maxNum = isset($maxRow['maxnum']) ? (int)$maxRow['maxnum'] : 0;
            $nextNum = $maxNum + 1;
            $memberNumber = 'M' . str_pad($nextNum, 6, '0', STR_PAD_LEFT);

            $this->db->insert('members', [
                'user_id' => $userId,
                'member_number' => $memberNumber,
                'first_name' => $this->sanitizeString($data['first_name']),
                'last_name' => $this->sanitizeString($data['last_name']),
                'email' => $email,
                'phone' => isset($data['phone']) ? $this->sanitizeString($data['phone']) : null,
                'membership_date' => date('Y-m-d')
            ]);

            // Generate token
            $token = $this->jwtService->generateToken([
                'user_id' => $userId,
                'email' => $email,
                'role' => $normalizedRole,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name']
            ]);

            $refreshToken = $this->jwtService->generateRefreshToken([
                'user_id' => $userId,
                'email' => $email
            ]);

            // Defer all slow sends — user gets the response immediately
            $firstName = $this->sanitizeString($data['first_name']);
            $lastName  = $this->sanitizeString($data['last_name']);
            $this->deferSend(function() use ($email, $firstName, $lastName, $pin, $rawPhone, $normalizedRole) {
                $logger = new LoggerService();

                $pinHtml = "
                    <p>Hi $firstName,</p>
                    <p>Welcome to Eternal Love Church! To activate your account, enter the PIN below:</p>
                    <div style='font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:20px;background:#f9f9f9;border-radius:8px;margin:20px 0;'>$pin</div>
                    <p style='color:#666;font-size:13px;'>This PIN expires in 15 minutes. Do not share it with anyone.</p>
                ";
                try {
                    $this->mailService->sendCustomEmail(
                        [['email' => $email, 'name' => "$firstName $lastName"]],
                        'Your Eternal Love Church Verification PIN',
                        $pinHtml
                    );
                    $logger->info('Verification PIN email sent', ['email' => $email]);
                } catch (Exception $mailErr) {
                    $logger->error('PIN email failed: ' . $mailErr->getMessage(), ['email' => $email]);
                }

                try {
                    $waBody = "Hi $firstName, welcome to Eternal Love Church!\n\nYour verification PIN is: *$pin*\n\nEnter this PIN to activate your account. It expires in 15 minutes.";
                    $this->smsService->send([['phone' => $rawPhone]], $waBody);
                } catch (Exception $waErr) {
                    error_log('PIN WhatsApp failed: ' . $waErr->getMessage());
                }

                try {
                    $notificationService = new \App\Service\PastorNotificationService($this->db);
                    $notificationService->notifyNewRegistration([
                        'name' => "$firstName $lastName",
                        'email' => $email,
                        'phone' => $rawPhone,
                        'role'  => $normalizedRole,
                    ]);
                } catch (Exception $notifyError) {
                    $logger->error('Failed to send pastor notification', ['email' => $email, 'error' => $notifyError->getMessage()]);
                }
            });

            return $this->jsonResponse([
                'status'  => 'pending_verification',
                'message' => 'A 6-digit PIN has been sent to your email and WhatsApp. Enter it to activate your account.',
                'email'   => $email,
                'phone'   => $rawPhone,
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function verifyPin(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data  = json_decode($request->getBody()->getContents(), true) ?? [];
            $email = trim($data['email'] ?? '');
            $pin   = trim($data['pin'] ?? '');

            if (!$email || !$pin) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Email and PIN are required'], 400);
            }

            $user = $this->db->first(
                "SELECT id, email, first_name, last_name, role, phone, phone_pin, phone_pin_expires, phone_verified, zone_id, cell_id
                 FROM users WHERE email = ?",
                [$email]
            );

            if (!$user) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Account not found'], 404);
            }
            if ((int)$user['phone_verified'] === 1) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Account already verified. Please log in.'], 409);
            }
            if ($user['phone_pin'] !== $pin) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid PIN'], 400);
            }
            if (strtotime($user['phone_pin_expires']) < time()) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'PIN has expired. Please request a new one.'], 400);
            }

            // Activate account
            $this->db->query(
                "UPDATE users SET is_active = 1, phone_verified = 1, phone_pin = NULL, phone_pin_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$user['id']]
            );

            // Defer welcome sends — user gets their token immediately
            $firstName = $user['first_name'];
            $this->deferSend(function() use ($user, $firstName) {
                try {
                    $frontendUrl = getenv('FRONTEND_URL') ?: 'https://elchurch.site';
                    $this->mailService->sendWelcomeEmail($user['email'], $firstName, $user['last_name'], $frontendUrl . '/login');
                } catch (Exception $ignored) {}
                try {
                    $waBody = "Welcome to Eternal Love Church, $firstName! 🙏 Your account is now active. Login at elchurch.site - God bless you!";
                    $this->smsService->send([['phone' => $user['phone']]], $waBody);
                } catch (Exception $ignored) {}
            });

            // Issue token
            $token = $this->jwtService->generateToken([
                'user_id'    => $user['id'],
                'email'      => $user['email'],
                'role'       => $user['role'],
                'first_name' => $user['first_name'],
                'last_name'  => $user['last_name'],
                'zone_id'    => $user['zone_id'] ?? null,
                'cell_id'    => $user['cell_id'] ?? null,
            ]);
            $refreshToken = $this->jwtService->generateRefreshToken(['user_id' => $user['id'], 'email' => $user['email']]);

            $this->db->query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [$user['id']]);

            return $this->jsonResponse([
                'status'        => 'success',
                'message'       => 'Account verified! Welcome to Eternal Love Church.',
                'token'         => $token,
                'refresh_token' => $refreshToken,
                'user'          => [
                    'id'         => $user['id'],
                    'email'      => $user['email'],
                    'first_name' => $user['first_name'],
                    'last_name'  => $user['last_name'],
                    'role'       => $user['role'],
                ],
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function resendPin(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data  = json_decode($request->getBody()->getContents(), true) ?? [];
            $email = trim($data['email'] ?? '');
            if (!$email) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Email is required'], 400);
            }

            $user = $this->db->first(
                "SELECT id, email, first_name, last_name, phone, phone_verified FROM users WHERE email = ?",
                [$email]
            );

            if (!$user) {
                return $this->jsonResponse(['status' => 'success', 'message' => 'If the account exists a new PIN has been sent'], 200);
            }
            if ((int)$user['phone_verified'] === 1) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Account already verified. Please log in.'], 409);
            }

            $pin    = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $pinExp = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $this->db->query(
                "UPDATE users SET phone_pin = ?, phone_pin_expires = ? WHERE id = ?",
                [$pin, $pinExp, $user['id']]
            );

            $firstName = $user['first_name'];
            $this->deferSend(function() use ($email, $firstName, $user, $pin) {
                $pinHtml = "<p>Hi $firstName,</p><p>Your new verification PIN is:</p>
                    <div style='font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:20px;background:#f9f9f9;border-radius:8px;margin:20px 0;'>$pin</div>
                    <p style='color:#666;font-size:13px;'>Expires in 15 minutes.</p>";
                try {
                    $this->mailService->sendCustomEmail(
                        [['email' => $email, 'name' => "$firstName {$user['last_name']}"]],
                        'Your New Eternal Love Church Verification PIN',
                        $pinHtml
                    );
                } catch (Exception $ignored) {}

                if (!empty($user['phone'])) {
                    try {
                        $this->smsService->send([['phone' => $user['phone']]], "Hi $firstName, your new ELC verification PIN is: *$pin*\n\nExpires in 15 minutes.");
                    } catch (Exception $ignored) {}
                }
            });

            return $this->jsonResponse(['status' => 'success', 'message' => 'A new PIN has been sent to your email and WhatsApp']);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function profile(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $userId = $this->getUserId($request);
            
            // First, try the query with must_change_password column
            try {
                $user = $this->db->first(
                    "SELECT id, uuid, email, first_name, last_name, phone, role, is_active, email_verified, must_change_password, last_login, created_at 
                     FROM users WHERE id = ?",
                    [$userId]
                );
            } catch (Exception $e) {
                // If must_change_password column doesn't exist, query without it
                $user = $this->db->first(
                    "SELECT id, uuid, email, first_name, last_name, phone, role, is_active, email_verified, last_login, created_at 
                     FROM users WHERE id = ?",
                    [$userId]
                );
                
                // Ensure the column exists for next time
                try {
                    $pdo = $this->db->getConnection();
                    $pdo->exec("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0");
                } catch (Exception $ignored) {
                    // Column might already exist or error is not critical
                }
                
                // Set default value
                if ($user) {
                    $user['must_change_password'] = false;
                }
            }

            if (!$user) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'User not found'
                ], 404);
            }

            // Get member data
            $member = $this->db->first(
                "SELECT * FROM members WHERE user_id = ?",
                [$userId]
            );

            $user['mustChangePassword'] = (bool)($user['must_change_password'] ?? false);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'user' => $user,
                    'member' => $member
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function forgotPassword(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);

            $rawIdentifier = $data['email'] ?? $data['phone'] ?? null;
            if (empty($rawIdentifier)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Email or phone number is required'
                ], 400);
            }

            $isPhone = !str_contains($rawIdentifier, '@');
            if ($isPhone) {
                $identifier = \App\Services\WhatsAppService::normalizePhone($rawIdentifier);
                $user = $this->db->first("SELECT id, email, first_name, last_name, phone FROM users WHERE phone = ? AND is_active = 1", [$identifier]);
            } else {
                $identifier = filter_var($rawIdentifier, FILTER_SANITIZE_EMAIL);
                $user = $this->db->first("SELECT id, email, first_name, last_name, phone FROM users WHERE email = ?", [$identifier]);
            }
            $email = $user['email'] ?? $identifier;

            if ($user) {
                $resetToken = bin2hex(random_bytes(32));
                $resetExpires = gmdate('Y-m-d H:i:s', time() + 86400); // 24 hours, stored in UTC

                $this->db->query(
                    "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
                    [$resetToken, $resetExpires, $user['id']]
                );

                $frontendUrl = getenv('FRONTEND_URL') ?: (defined('APP_URL') ? APP_URL : 'https://elchurch.site');
                $resetLink   = $frontendUrl . '/reset-password?token=' . $resetToken;
                $firstName   = $user['first_name'] ?? 'User';

                $this->deferSend(function() use ($email, $firstName, $user, $resetLink) {
                    $logger = new LoggerService();
                    try {
                        $sent = $this->mailService->sendPasswordResetEmail($email, $firstName, $user['last_name'] ?? '', $resetLink);
                        if ($sent) {
                            $logger->info('Password reset email successfully sent', ['email' => $email]);
                        } else {
                            $logger->warning('Password reset email NOT sent', ['email' => $email, 'smtp' => \App\Services\SMTPConfigService::getConfig()]);
                        }
                    } catch (Exception $mailError) {
                        $logger->error('Password reset email failed: ' . $mailError->getMessage(), ['email' => $email]);
                    }

                    if (!empty($user['phone'])) {
                        try {
                            $body = "Hi $firstName, here is your Eternal Love Church password reset link (expires in 24 hours):\n$resetLink\nIf you did not request this, please ignore.";
                            $this->smsService->send([['phone' => $user['phone']]], $body);
                        } catch (Exception $waErr) {
                            error_log('Password reset WhatsApp failed: ' . $waErr->getMessage());
                        }
                    }
                });
            }

            // Always return success for security
            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'If an account exists, a reset link has been sent'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Request failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resetPassword(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['token']) || !isset($data['newPassword'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Token and new password are required'
                ], 400);
            }

            $user = $this->db->first(
                "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > UTC_TIMESTAMP()",
                [$data['token']]
            );

            if (!$user) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid or expired reset token'
                ], 400);
            }

            $hashedPassword = password_hash($data['newPassword'], PASSWORD_DEFAULT);
            
            $this->db->query(
                "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
                [$hashedPassword, $user['id']]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Password reset successful'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Reset failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function refreshToken(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['refresh_token'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Refresh token is required'
                ], 400);
            }

            $decoded = $this->jwtService->decode($data['refresh_token']);
            $user = $this->db->first(
                "SELECT id, email, first_name, last_name, role, zone_id, cell_id, is_active FROM users WHERE id = ?",
                [(int)$decoded->sub]
            );

            if (!$user || !(int)($user['is_active'] ?? 0)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'User account is inactive or unavailable'
                ], 401);
            }

            $newToken = $this->jwtService->generateToken([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'zone_id' => $user['zone_id'] ?? null,
                'cell_id' => $user['cell_id'] ?? null
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'token' => $newToken,
                'refresh_token' => $this->jwtService->generateRefreshToken([
                    'user_id' => $user['id'],
                    'email' => $user['email']
                ])
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Token refresh failed: ' . $e->getMessage()
            ], 401);
        }
    }

    public function changePassword(
        \Psr\Http\Message\ServerRequestInterface $request,
        \Psr\Http\Message\ResponseInterface $response
    ): \Psr\Http\Message\ResponseInterface
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true) ?? [];

            $newPassword = $data['newPassword'] ?? $data['password'] ?? null;
            $newPasswordConfirm = $data['newPasswordConfirm'] ?? null;
            $currentPassword = $data['currentPassword'] ?? null;

            if (!$newPassword) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'New password is required'
                ], 400);
            }

            if ($newPasswordConfirm !== null && $newPassword !== $newPasswordConfirm) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Password confirmation does not match'
                ], 400);
            }

            if (strlen($newPassword) < 8) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Password must be at least 8 characters'
                ], 400);
            }

            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 401);
            }

            $user = $this->db->first("SELECT * FROM users WHERE id = ?", [$userId]);
            if (!$user) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'User not found'
                ], 404);
            }

            if ($currentPassword && !password_verify($currentPassword, $user['password'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Current password is incorrect'
                ], 400);
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $this->db->query(
                "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$hashedPassword, $userId]
            );

            $freshUser = $this->db->first(
                "SELECT id, uuid, email, first_name, last_name, phone, role, is_active, email_verified, must_change_password, last_login, created_at
                 FROM users WHERE id = ?",
                [$userId]
            );
            $freshUser['mustChangePassword'] = (bool)($freshUser['must_change_password'] ?? false);

            // SMS password-change security alert
            if (!empty($freshUser['phone'])) {
                try {
                    $name = trim($freshUser['first_name'] ?? '');
                    $body = "Hi $name, your Eternal Love Church password was just changed. If this wasn't you, contact us immediately.";
                    $this->smsService->send([['phone' => $freshUser['phone']]], $body);
                } catch (Exception $smsError) {
                    error_log('Password change SMS failed: ' . $smsError->getMessage());
                }
            }

            $token = $this->jwtService->generateToken([
                'user_id' => $freshUser['id'],
                'email' => $freshUser['email'],
                'role' => $freshUser['role'],
                'first_name' => $freshUser['first_name'],
                'last_name' => $freshUser['last_name']
            ]);

            $refreshToken = $this->jwtService->generateRefreshToken([
                'user_id' => $freshUser['id'],
                'email' => $freshUser['email']
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Password updated successfully',
                'token' => $token,
                'refresh_token' => $refreshToken,
                'user' => $freshUser
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Password update failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function logout(Request $request, Response $response): Response
    {
        // In JWT, logout is handled client-side by deleting the token
        // Could implement token blacklist in Redis if needed
        return $this->jsonResponse([
            'status' => 'success',
            'message' => 'Logged out successfully'
        ]);
    }

    private function sendResetEmail(string $email, string $token): bool
    {
        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = getenv('MAIL_HOST');
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME');
            $mail->Password = getenv('MAIL_PASSWORD');
            $mail->SMTPSecure = getenv('MAIL_ENCRYPTION') ?: 'tls';
            $mail->Port = getenv('MAIL_PORT') ?: 587;
            
            $mail->setFrom(getenv('MAIL_FROM_ADDRESS'), getenv('MAIL_FROM_NAME'));
            $mail->addAddress($email);
            $mail->isHTML(true);
            
            $resetUrl = APP_URL . '/reset-password?token=' . $token;
            
            $mail->Subject = 'Reset Your Password - Eternal Love Church';
            $mail->Body = "
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <p><a href='$resetUrl'>$resetUrl</a></p>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this reset, please ignore this email.</p>
            ";
            
            return $mail->send();
        } catch (MailerException $e) {
            error_log('Mail error: ' . $e->getMessage());
            return false;
        }
    }
}


