import { Request, Response, NextFunction } from 'express';
import services from '../domains';

/**
 * Authentication middleware
 * 
 * Validates user tokens and agent tokens.
 * Phase 4: Implementation
 */

export interface AuthRequest extends Request {
  userId?: string;
  agentId?: string;
  linkedInAccountId?: string;
  tokenType?: 'user' | 'agent';
}

/**
 * Middleware to validate user tokens (for dashboard APIs)
 * 
 * Phase 4: Basic implementation - validates token format
 * TODO: Integrate with auth provider (Clerk, Auth0, etc.)
 */
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      errorCode: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header'
    });
    return;
  }

  const token = authHeader.substring(7);
  
  // Phase 4: Basic token validation
  // TODO: Integrate with actual auth provider
  // For now, we'll extract userId from token (assuming simple format)
  // In production, this would validate JWT or session token
  
  // Temporary: Extract userId from token (assuming token format: user_<userId>)
  if (token.startsWith('user_')) {
    const userId = token.substring(5);
    // Validate user exists
    const user = await services.authIdentity.getUserById(userId);
    if (!user) {
      res.status(401).json({
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid user token'
      });
      return;
    }
    req.userId = userId;
    req.tokenType = 'user';
    next();
  } else {
    res.status(401).json({
      errorCode: 'UNAUTHORIZED',
      message: 'Invalid token format'
    });
  }
};

/**
 * Middleware to validate agent tokens (for agent APIs)
 */
export const authenticateAgent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      errorCode: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header'
    });
    return;
  }

  const token = authHeader.substring(7);
  
  // Validate agent token
  const tokenData = await services.agentManagement.validateAgentToken(token);
  
  if (!tokenData) {
    res.status(401).json({
      errorCode: 'UNAUTHORIZED',
      message: 'Invalid or expired agent token'
    });
    return;
  }

  req.agentId = tokenData.agentId;
  req.linkedInAccountId = tokenData.linkedInAccountId;
  req.tokenType = 'agent';
  next();
};

