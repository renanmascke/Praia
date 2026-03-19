-- Performance indexes for SyncLog (reduce scans on remote DB)
CREATE INDEX `SyncLog_runId_status_idx` ON `SyncLog`(`runId`, `status`);
CREATE INDEX `SyncLog_type_status_startTime_idx` ON `SyncLog`(`type`, `status`, `startTime`);

