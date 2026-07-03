<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class BlogController extends BaseController
{
    private function normalizeGalleryImages($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = array_values(array_filter(array_map('trim', explode(',', $value))));
            }
        }

        if (!is_array($value)) {
            return [];
        }

        $normalized = [];
        foreach ($value as $item) {
            if (is_array($item)) {
                $url = $item['url'] ?? $item['image_url'] ?? $item['path'] ?? $item['src'] ?? $item['file_path'] ?? null;
                if ($url) {
                    $normalized[] = [
                        'url' => $this->sanitizeString($url),
                        'caption' => isset($item['caption']) ? $this->sanitizeString($item['caption']) : null,
                        'alt_text' => isset($item['alt_text']) ? $this->sanitizeString($item['alt_text']) : null,
                    ];
                }
            } elseif (is_string($item) && trim($item) !== '') {
                $normalized[] = $this->sanitizeString($item);
            }
        }

        return $normalized;
    }

    private function resolveCoverImage(array $data, array $galleryImages): ?string
    {
        $featured = $data['featured_image'] ?? $data['featuredImage'] ?? null;
        if (is_string($featured) && trim($featured) !== '') {
            return $this->sanitizeString($featured);
        }

        foreach ($galleryImages as $item) {
            if (is_string($item) && trim($item) !== '') {
                return $this->sanitizeString($item);
            }
            if (is_array($item) && !empty($item['url'])) {
                return $this->sanitizeString($item['url']);
            }
        }

        return null;
    }

    public function getAdminPosts(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $page = max(1, (int)($params['page'] ?? 1));
            $limit = max(1, min(100, (int)($params['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $whereClauses = [];
            $queryParams = [];

            if (!empty($params['status']) && in_array($params['status'], ['draft', 'published', 'archived'], true)) {
                $whereClauses[] = "bp.status = ?";
                $queryParams[] = $params['status'];
            }

            if (!empty($params['search'])) {
                $whereClauses[] = "(bp.title LIKE ? OR bp.content LIKE ? OR bp.excerpt LIKE ?)";
                $search = '%' . $this->sanitizeString($params['search']) . '%';
                $queryParams[] = $search;
                $queryParams[] = $search;
                $queryParams[] = $search;
            }

            $whereSql = !empty($whereClauses) ? ('WHERE ' . implode(' AND ', $whereClauses)) : '';

            $totalRow = $this->db->first(
                "SELECT COUNT(*) as total
                 FROM blog_posts bp
                 $whereSql",
                $queryParams
            );
            $total = (int)($totalRow['total'] ?? 0);

            $posts = $this->db->all(
                "SELECT bp.*, u.first_name, u.last_name
                 FROM blog_posts bp
                 LEFT JOIN users u ON bp.author_id = u.id
                 $whereSql
                 ORDER BY bp.updated_at DESC, bp.created_at DESC
                 LIMIT ? OFFSET ?",
                array_merge($queryParams, [$limit, $offset])
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => $limit > 0 ? (int)ceil($total / $limit) : 1
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch admin posts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAdminPost(Request $request, Response $response, array $args): Response
    {
        try {
            $post = $this->db->first(
                "SELECT bp.*, u.first_name, u.last_name
                 FROM blog_posts bp
                 LEFT JOIN users u ON bp.author_id = u.id
                 WHERE bp.id = ?",
                [(int)$args['id']]
            );

            if (!$post) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Post not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $post
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch admin post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPublicPosts(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $sql = "SELECT bp.*, u.first_name, u.last_name 
                    FROM blog_posts bp 
                    LEFT JOIN users u ON bp.author_id = u.id 
                    WHERE bp.status = 'published'";
            
            if (isset($params['category'])) {
                $sql .= " AND bp.category = ?";
            }
            if (isset($params['search'])) {
                $sql .= " AND (bp.title LIKE ? OR bp.content LIKE ? OR bp.excerpt LIKE ?)";
            }
            if (isset($params['limit'])) {
                $sql .= " LIMIT " . (int)$params['limit'];
            }
            
            if (isset($params['category'])) {
                $category = $this->sanitizeString($params['category']);
                if (isset($params['search'])) {
                    $search = "%" . $this->sanitizeString($params['search']) . "%";
                    $posts = $this->db->all($sql, [$category, $search, $search, $search]);
                } else {
                    $posts = $this->db->all($sql, [$category]);
                }
            } elseif (isset($params['search'])) {
                $search = "%" . $this->sanitizeString($params['search']) . "%";
                $posts = $this->db->all($sql, [$search, $search, $search]);
            } else {
                $posts = $this->db->all($sql);
            }

            $sql .= " ORDER BY bp.published_at DESC, bp.created_at DESC";

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch blog posts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPublicPost(Request $request, Response $response, array $args): Response
    {
        try {
            $slug = $args['slug'];
            $isNumericId = ctype_digit((string)$slug);
            $sql = "SELECT bp.*, u.first_name, u.last_name
                    FROM blog_posts bp
                    LEFT JOIN users u ON bp.author_id = u.id
                    WHERE bp.status = 'published' AND (bp.slug = ?";
            $params = [$slug];
            if ($isNumericId) {
                $sql .= " OR bp.id = ?";
                $params[] = (int)$slug;
            }
            $sql .= ") LIMIT 1";
            $post = $this->db->first($sql, $params);
            
            if (!$post) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Post not found'
                ], 404);
            }

            // Increment views
            $this->db->query("UPDATE blog_posts SET views = views + 1 WHERE id = ?", [$post['id']]);
            $post['views'] = ($post['views'] ?? 0) + 1;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $post
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getFeatured(Request $request, Response $response): Response
    {
        try {
            $posts = $this->db->all(
                "SELECT bp.*, u.first_name, u.last_name
                 FROM blog_posts bp
                 LEFT JOIN users u ON bp.author_id = u.id
                 WHERE bp.status = 'published'
                 ORDER BY bp.views DESC, bp.published_at DESC, bp.created_at DESC
                 LIMIT 5"
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch featured posts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAll(Request $request, Response $response): Response
    {
        try {
            $page = (int)($request->getQueryParams()['page'] ?? 1);
            $limit = (int)($request->getQueryParams()['limit'] ?? 20);
            $result = $this->paginate('blog_posts', $page, $limit);
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch posts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $post = $this->db->first("SELECT * FROM blog_posts WHERE id = ?", [$args['id']]);
            
            if (!$post) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Post not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $post
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['title', 'content'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $userId = $this->getUserId($request);
            
            // Generate slug
            $slug = $this->generateSlug($data['title']);
            
            $postData = [
                'title' => $this->sanitizeString($data['title']),
                'slug' => $slug,
                'excerpt' => isset($data['excerpt']) ? $this->sanitizeString($data['excerpt']) : substr(strip_tags($data['content']), 0, 160),
                'content' => $data['content'],
                'featured_image' => $this->resolveCoverImage($data, $this->normalizeGalleryImages($data['gallery_images'] ?? [])),
                'gallery_images' => !empty($data['gallery_images']) ? json_encode($this->normalizeGalleryImages($data['gallery_images'])) : null,
                'author_id' => $userId,
                'category' => isset($data['category']) ? $this->sanitizeString($data['category']) : null,
                'tags' => isset($data['tags']) ? json_encode($data['tags']) : null,
                'status' => isset($data['status']) && in_array($data['status'], ['draft', 'published', 'archived']) ? $data['status'] : 'draft',
                'meta_title' => isset($data['meta_title']) ? $this->sanitizeString($data['meta_title']) : $data['title'],
                'meta_description' => isset($data['meta_description']) ? $this->sanitizeString($data['meta_description']) : null,
                'published_at' => isset($data['status']) && $data['status'] === 'published' ? date('Y-m-d H:i:s') : null
            ];

            $postId = $this->db->insert('blog_posts', $postData);
            $post = $this->db->first("SELECT * FROM blog_posts WHERE id = ?", [$postId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Post created successfully',
                'data' => $post
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $postId = $args['id'];
            
            $allowedFields = [
                'title', 'excerpt', 'content', 'featured_image', 'gallery_images', 'category',
                'tags', 'status', 'meta_title', 'meta_description'
            ];
            
            $updateData = [];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'tags') {
                        $updateData[$field] = json_encode($data[$field]);
                    } elseif ($field === 'gallery_images') {
                        $galleryImages = $this->normalizeGalleryImages($data[$field]);
                        $updateData[$field] = !empty($galleryImages) ? json_encode($galleryImages) : null;
                        if (empty($updateData['featured_image'])) {
                            $updateData['featured_image'] = $this->resolveCoverImage($data, $galleryImages);
                        }
                    } elseif ($field === 'status') {
                        if (in_array($data[$field], ['draft', 'published', 'archived'])) {
                            $updateData[$field] = $data[$field];
                            if ($data[$field] === 'published' && !isset($data['published_at'])) {
                                $updateData['published_at'] = date('Y-m-d H:i:s');
                            }
                        }
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

            // Update slug if title changed
            if (isset($data['title'])) {
                $updateData['slug'] = $this->generateSlug($data['title']);
            }

            if (!isset($updateData['featured_image']) && isset($data['featured_image'])) {
                $updateData['featured_image'] = $this->sanitizeString($data['featured_image']);
            }

            $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
            $this->db->query(
                "UPDATE blog_posts SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                array_merge(array_values($updateData), [$postId])
            );

            $post = $this->db->first("SELECT * FROM blog_posts WHERE id = ?", [$postId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Post updated successfully',
                'data' => $post
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $postId = $args['id'];
            $deleted = $this->db->delete('blog_posts', 'id = ?', [$postId]);
            
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Post not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Post deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getDrafts(Request $request, Response $response): Response
    {
        try {
            $posts = $this->db->all("SELECT * FROM blog_posts WHERE status = 'draft' ORDER BY updated_at DESC");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch drafts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getFeaturedAdmin(Request $request, Response $response): Response
    {
        try {
            $posts = $this->db->all("SELECT * FROM blog_posts WHERE status = 'published' ORDER BY views DESC LIMIT 5");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch featured posts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_posts' => $this->db->first("SELECT COUNT(*) as count FROM blog_posts")['count'],
                'published_posts' => $this->db->first("SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'")['count'],
                'draft_posts' => $this->db->first("SELECT COUNT(*) as count FROM blog_posts WHERE status = 'draft'")['count'],
                'total_views' => $this->db->first("SELECT SUM(views) as total FROM blog_posts")['total'] ?? 0,
                'categories' => $this->db->all("SELECT category, COUNT(*) as count FROM blog_posts WHERE category IS NOT NULL GROUP BY category")
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

    public function getCategories(Request $request, Response $response): Response
    {
        try {
            $categories = $this->db->all("SELECT DISTINCT category FROM blog_posts WHERE category IS NOT NULL ORDER BY category");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => array_column($categories, 'category')
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get categories: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createCategory(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['category'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Category name is required'
                ], 400);
            }

            // Categories are just strings in the posts table, so this is a no-op
            // In a full implementation, you'd have a separate categories table
            
            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Category created (note: categories are stored as strings in posts)'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function search(Request $request, Response $response): Response
    {
        try {
            $query = $request->getQueryParams()['q'] ?? '';
            
            if (empty($query)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Search query is required'
                ], 400);
            }

            $searchTerm = "%$query%";
            $posts = $this->db->all(
                "SELECT bp.*, u.first_name, u.last_name 
                 FROM blog_posts bp 
                 LEFT JOIN users u ON bp.author_id = u.id 
                 WHERE bp.status = 'published' 
                 AND (bp.title LIKE ? OR bp.content LIKE ? OR bp.excerpt LIKE ?)
                 ORDER BY bp.published_at DESC",
                [$searchTerm, $searchTerm, $searchTerm]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $posts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Search failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getComments(Request $request, Response $response, array $args): Response
    {
        try {
            $postId = $args['postId'];
            $comments = $this->db->all(
                "SELECT bc.*, u.first_name, u.last_name 
                 FROM blog_comments bc 
                 LEFT JOIN users u ON bc.user_id = u.id 
                 WHERE bc.post_id = ? 
                 ORDER BY bc.created_at ASC",
                [$postId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $comments
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch comments: ' . $e->getMessage()
            ], 500);
        }
    }

    public function addComment(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            if (!isset($data['content'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Comment content is required'
                ], 400);
            }

            $commentData = [
                'post_id' => $args['postId'],
                'user_id' => $userId,
                'author_name' => isset($data['author_name']) ? $this->sanitizeString($data['author_name']) : null,
                'author_email' => isset($data['author_email']) ? filter_var($data['author_email'], FILTER_SANITIZE_EMAIL) : null,
                'content' => $this->sanitizeString($data['content']),
                'parent_id' => isset($data['parent_id']) ? (int)$data['parent_id'] : null,
                'is_approved' => $userId ? 1 : 0
            ];

            $commentId = $this->db->insert('blog_comments', $commentData);
            $comment = $this->db->first("SELECT * FROM blog_comments WHERE id = ?", [$commentId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Comment added successfully',
                'data' => $comment
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to add comment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateComment(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $commentId = $args['id'];
            
            if (!isset($data['content'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Comment content is required'
                ], 400);
            }

            $this->db->query(
                "UPDATE blog_comments SET content = ? WHERE id = ?",
                [$this->sanitizeString($data['content']), $commentId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Comment updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update comment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteComment(Request $request, Response $response, array $args): Response
    {
        try {
            $commentId = $args['id'];
            $deleted = $this->db->delete('blog_comments', 'id = ?', [$commentId]);
            
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Comment not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Comment deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete comment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function likePost(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Authentication required'
                ], 401);
            }

            $postLookup = $args['id'];
            $post = ctype_digit((string)$postLookup)
                ? $this->db->first("SELECT id FROM blog_posts WHERE id = ?", [(int)$postLookup])
                : $this->db->first("SELECT id FROM blog_posts WHERE slug = ?", [$postLookup]);

            if (!$post) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Post not found'
                ], 404);
            }

            $postId = (int)$post['id'];
            $existingLike = $this->db->first(
                "SELECT id FROM activity_logs WHERE user_id = ? AND action = 'blog_like' AND entity_type = 'blog_post' AND entity_id = ?",
                [$userId, $postId]
            );

            $liked = false;
            if ($existingLike) {
                $this->db->delete('activity_logs', 'id = ?', [(int)$existingLike['id']]);
                $liked = false;
            } else {
                $this->db->insert('activity_logs', [
                    'user_id' => $userId,
                    'action' => 'blog_like',
                    'entity_type' => 'blog_post',
                    'entity_id' => $postId,
                    'details' => json_encode(['source' => 'blog']),
                ]);
                $liked = true;
            }

            $likesCount = (int)($this->db->first(
                "SELECT COUNT(*) as count FROM activity_logs WHERE action = 'blog_like' AND entity_type = 'blog_post' AND entity_id = ?",
                [$postId]
            )['count'] ?? 0);

            return $this->jsonResponse([
                'status' => 'success',
                'liked' => $liked,
                'likes' => $likesCount,
                'data' => [
                    'post_id' => $postId,
                    'liked' => $liked,
                    'likes' => $likesCount
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to like post: ' . $e->getMessage()
            ], 500);
        }
    }

    public function likeComment(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Authentication required'
                ], 401);
            }

            $commentId = (int)$args['id'];

            $existingLike = $this->db->first(
                "SELECT id FROM activity_logs WHERE user_id = ? AND action = 'blog_comment_like' AND entity_type = 'blog_comment' AND entity_id = ?",
                [$userId, $commentId]
            );

            $liked = false;
            if ($existingLike) {
                $this->db->delete('activity_logs', 'id = ?', [(int)$existingLike['id']]);
                $liked = false;
            } else {
                $this->db->insert('activity_logs', [
                    'user_id' => $userId,
                    'action' => 'blog_comment_like',
                    'entity_type' => 'blog_comment',
                    'entity_id' => $commentId,
                    'details' => json_encode(['source' => 'blog_comment']),
                ]);
                $liked = true;
            }

            $likesCount = (int)($this->db->first(
                "SELECT COUNT(*) as count FROM activity_logs WHERE action = 'blog_comment_like' AND entity_type = 'blog_comment' AND entity_id = ?",
                [$commentId]
            )['count'] ?? 0);

            return $this->jsonResponse([
                'status' => 'success',
                'liked' => $liked,
                'likes' => $likesCount,
                'data' => [
                    'comment_id' => $commentId,
                    'liked' => $liked,
                    'likes' => $likesCount
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to like comment: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generateSlug(string $title): string
    {
        $slug = strtolower(trim($title));
        $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');
        
        // Check for uniqueness
        $existing = $this->db->first("SELECT id FROM blog_posts WHERE slug = ?", [$slug]);
        if ($existing) {
            $slug .= '-' . time();
        }
        
        return $slug;
    }
}

