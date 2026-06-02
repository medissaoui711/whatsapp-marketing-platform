import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import type { RequestWithAuth } from './auth';

export interface OrganizationContext {
  user: {
    id: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
  };
}

export interface RequestWithOrg extends RequestWithAuth {
  org?: OrganizationContext;
}

export function organizationContextMiddleware() {
  return async (request: NextRequest): Promise<RequestWithOrg | NextResponse> => {
    const auth = (request as RequestWithAuth).auth;

    if (!auth) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id: auth.userId,
        organizationId: auth.tenantId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: auth.tenantId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 401 }
      );
    }

    let orgSettings: Record<string, unknown> = {};
    try {
      orgSettings = organization.settings as Record<string, unknown>;
    } catch {
      orgSettings = {};
    }

    (request as RequestWithOrg).org = {
      user: {
        id: user.id,
        email: user.email,
        role: user.roleId || 'viewer',
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        settings: orgSettings,
      },
    };

    return request as RequestWithOrg;
  };
}


