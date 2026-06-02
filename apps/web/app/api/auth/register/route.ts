import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@repo/db';
import { registerSchema } from '@repo/shared';
import { generateTokens } from '@repo/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات التسجيل غير صحيحة',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { email, password, fullName, organizationId } = validation.data;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'المنظمة غير موجودة' }, { status: 404 });
    }

    let defaultRole = await prisma.customRole.findFirst({
      where: { organizationId, isDefault: true },
    });

    if (!defaultRole) {
      defaultRole = await prisma.customRole.findFirst({
        where: { organizationId, name: 'agent', isSystem: true },
      });
    }

    if (!defaultRole) {
      return NextResponse.json({ error: 'لم يتم العثور على دور افتراضي للمنظمة' }, { status: 500 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (!existingUser.passwordHash) {
        return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل عبر مزود خارجي' }, { status: 409 });
      }

      const isValid = await bcrypt.compare(password, existingUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({
          error: 'يوجد حساب بهذا البريد الإلكتروني. الرجاء تسجيل الدخول وطلب إضافتك من مدير المنظمة.',
        }, { status: 409 });
      }

      if (!existingUser.isActive) {
        return NextResponse.json({ error: 'الحساب معطل' }, { status: 401 });
      }

      const existingMembership = await prisma.userOrganization.findFirst({
        where: { userId: existingUser.id, organizationId },
      });

      if (existingMembership) {
        return NextResponse.json({ error: 'أنت بالفعل عضو في هذه المنظمة' }, { status: 409 });
      }

      await prisma.userOrganization.create({
        data: { userId: existingUser.id, organizationId, roleId: defaultRole.id, isDefault: false },
      });

      const tokens = generateTokens({
        userId: existingUser.id,
        email: existingUser.email,
        role: defaultRole.name,
        tenantId: organizationId,
        isSuperAdmin: existingUser.isSuperAdmin,
        roleId: defaultRole.id,
        organizationId,
      });

      return createAuthResponse(existingUser, organizationId, tokens, org);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        organizationId,
        roleId: defaultRole.id,
        isActive: true,
      },
    });

    await prisma.userOrganization.create({
      data: { userId: newUser.id, organizationId, roleId: defaultRole.id, isDefault: true },
    });

    const tokens = generateTokens({
      userId: newUser.id,
      email: newUser.email,
      role: defaultRole.name,
      tenantId: organizationId,
      isSuperAdmin: newUser.isSuperAdmin,
      roleId: defaultRole.id,
      organizationId,
    });

    return createAuthResponse(newUser, organizationId, tokens, org);
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
}

function createAuthResponse(
  user: { id: string; email: string; fullName: string | null; isActive: boolean; isSuperAdmin: boolean },
  organizationId: string,
  tokens: { accessToken: string; refreshToken: string },
  org: { id: string; name: string; slug: string },
) {
  const accessMaxAge = parseInt(process.env.JWT_ACCESS_EXPIRY_MINS || '15') * 60;
  const refreshMaxAge = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7') * 24 * 60 * 60;

  const response = NextResponse.json({
    expiresIn: accessMaxAge,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      organization: { id: org.id, name: org.name, slug: org.slug },
    },
  });

  response.cookies.set('whm_access', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: accessMaxAge,
    path: '/',
  });

  response.cookies.set('whm_refresh', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: refreshMaxAge,
    path: '/',
  });

  return response;
}


