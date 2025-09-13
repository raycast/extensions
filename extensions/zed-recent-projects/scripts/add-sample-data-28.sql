-- Sample data for Zed v28 fixture

-- Imitate latest applied migration for v28
CREATE TABLE migrations (
    domain TEXT,
    step INTEGER,
    migration TEXT
);

INSERT INTO migrations ("domain", step, migration)
VALUES('WorkspaceDb', 28, '');

-- Insert sample remote connections
INSERT INTO remote_connections (id, kind, host, port, user, distro) VALUES (1, 'ssh', 'remote-host', NULL, NULL, NULL);

-- Insert sample workspaces
INSERT INTO workspaces (workspace_id, paths, paths_order, remote_connection_id, timestamp, window_state, window_x, window_y, window_width, window_height, display, left_dock_visible, left_dock_active_panel, right_dock_visible, right_dock_active_panel, bottom_dock_visible, bottom_dock_active_panel, left_dock_zoom, right_dock_zoom, bottom_dock_zoom, fullscreen, centered_layout, session_id, window_id)
VALUES
(1, '/Users/user/Developer/zed-project-1', '0', NULL, '2025-09-13 07:49:52', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, 4294967297),
(2, '/Users/user/Developer/zed-project-2', '0', NULL, '2025-09-13 09:00:58', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, 4294967297),
(3, '/Users/user/Developer/zed-project-3', '0', NULL, '2025-09-13 09:00:58', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, 4294967297),
(4, '/home/remote-user/Developer/remote-project-1', '0', 1, '2025-09-13 09:01:26', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, 4294967297),
(5, '/home/remote-user/Developer/remote-project-2', '0', 1, '2025-09-13 09:01:33', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 1, NULL, 0, NULL, 0, 0, 0, NULL, NULL, NULL, 4294967297);
