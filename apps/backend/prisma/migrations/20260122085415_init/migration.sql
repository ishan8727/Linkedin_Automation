-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LinkedInAccount" (
    "linkedInAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "sessionValidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInAccount_pkey" PRIMARY KEY ("linkedInAccountId")
);

-- CreateTable
CREATE TABLE "Agent" (
    "agentId" TEXT NOT NULL,
    "linkedInAccountId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "Job" (
    "jobId" TEXT NOT NULL,
    "linkedInAccountId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "jobType" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "state" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "JobResult" (
    "resultId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobResult_pkey" PRIMARY KEY ("resultId")
);

-- CreateTable
CREATE TABLE "RateLimitRule" (
    "ruleId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "maxCount" INTEGER NOT NULL,
    "windowDuration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RateLimitRule_pkey" PRIMARY KEY ("ruleId")
);

-- CreateTable
CREATE TABLE "Violation" (
    "violationId" TEXT NOT NULL,
    "linkedInAccountId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "jobId" TEXT,
    "violationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("violationId")
);

-- CreateTable
CREATE TABLE "RiskScore" (
    "scoreId" TEXT NOT NULL,
    "linkedInAccountId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factors" JSONB NOT NULL,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("scoreId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "logId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("logId")
);

-- CreateTable
CREATE TABLE "Metric" (
    "metricId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB NOT NULL,
    "aggregationWindow" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("metricId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_linkedInAccountId_key" ON "Agent"("linkedInAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "JobResult_jobId_key" ON "JobResult"("jobId");

-- AddForeignKey
ALTER TABLE "LinkedInAccount" ADD CONSTRAINT "LinkedInAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_linkedInAccountId_fkey" FOREIGN KEY ("linkedInAccountId") REFERENCES "LinkedInAccount"("linkedInAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_linkedInAccountId_fkey" FOREIGN KEY ("linkedInAccountId") REFERENCES "LinkedInAccount"("linkedInAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("agentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResult" ADD CONSTRAINT "JobResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResult" ADD CONSTRAINT "JobResult_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("agentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_linkedInAccountId_fkey" FOREIGN KEY ("linkedInAccountId") REFERENCES "LinkedInAccount"("linkedInAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RateLimitRule"("ruleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_linkedInAccountId_fkey" FOREIGN KEY ("linkedInAccountId") REFERENCES "LinkedInAccount"("linkedInAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;
