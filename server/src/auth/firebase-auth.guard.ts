import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Bypass authentication check for login endpoint
    if (request.url.includes('/auth/login')) {
      return true;
    }

    // Developer bypass auth check (only if set to true, though we default to false now)
    if (process.env.BYPASS_AUTH === 'true') {
      request.user = {
        id: 'dev-supervisor-id',
        email: 'dev@siteforce.com',
        role: 'owner',
        assignedZones: [],
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET ?? 'siteforce-secret-key-2026',
      });
      request.user = decoded; // Contains: id, email, role, assignedZones
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
