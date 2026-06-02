import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { replaceVariables, buildActionContext } from '@repo/shared/src/helpers/custom-action';
import { randomBytes } from 'crypto';

const redirectTokens = new Map<string, { url: string; expiresAt: Date }>();

function generateRedirectToken(url: string): string {
  const token = randomBytes(16).toString('hex');
  redirectTokens.set(token, {
    url,
    expiresAt: new Date(Date.now() + 30 * 1000),
  });
  return token;
}

async function executeWebhook(config: any, context: Record<string, any>): Promise<any> {
  const url = replaceVariables(config.url, context);
  const method = config.method || 'POST';
  const headers = config.headers || {};

  let body = config.body;
  if (!body) {
    body = JSON.stringify(context);
  } else {
    body = replaceVariables(body, context);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });

    let responseData: any;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const success = response.ok;
    return {
      success,
      message: success ? 'تم تنفيذ webhook بنجاح' : `webhook أعاد الحالة ${response.status}`,
      data: responseData,
      toast: {
        message: success ? 'تم تنفيذ webhook بنجاح' : `فشل webhook مع الحالة ${response.status}`,
        type: success ? 'success' : 'error',
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل تنفيذ webhook',
      toast: { message: 'فشل تنفيذ webhook', type: 'error' },
    };
  }
}

function executeUrl(config: any, context: Record<string, any>): any {
  const rawUrl = config.url;
  const url = replaceVariables(rawUrl, context);
  const token = generateRedirectToken(url);

  return {
    success: true,
    message: 'جاري فتح الرابط',
    redirectUrl: `/api/custom-actions/redirect/${token}`,
  };
}

function executeJavaScript(config: any, context: Record<string, any>): any {
  const code = config.code;

  const fn = new Function('context', 'contact', 'user', 'organization', `
    try {
      const result = (function() { ${code} })();
      if (result && typeof result === 'object') {
        if (result.url && typeof result.url === 'string') {
          result.redirectUrl = '/api/custom-actions/redirect/' + result.url;
          delete result.url;
        }
        return result;
      }
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.message,
        toast: { message: err.message, type: 'error' }
      };
    }
  `);

  const result = fn(context, context.contact, context.user, context.organization) || { success: true };

  return {
    success: true,
    message: 'تم تنفيذ كود JavaScript',
    ...result,
    toast: result.toast || { message: 'تم اكتمال الإجراء', type: 'success' },
  };
}

export const POST = withAuthAndPermission('custom_actions:execute')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const body = await request.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json({ error: 'contactId مطلوب' }, { status: 400 });
  }

  const action = await prisma.customAction.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!action) {
    return NextResponse.json({ error: 'الإجراء غير موجود' }, { status: 404 });
  }

  if (!action.isActive) {
    return NextResponse.json({ error: 'الإجراء غير نشط' }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  const org = await prisma.organization.findUnique({ where: { id: context.tenantId } });

  if (!user || !org) {
    return NextResponse.json({ error: 'المستخدم أو المنظمة غير موجودة' }, { status: 500 });
  }

  const execContext = buildActionContext(
    {
      id: contact.id,
      phoneNumber: contact.phoneNumber,
      profileName: contact.profileName ?? '',
      tags: contact.tags as string[],
      metadata: contact.metadata as Record<string, any>,
    },
    {
      id: user.id,
      fullName: user.fullName || user.email,
      email: user.email,
    },
    {
      id: org.id,
      name: org.name,
    },
  );

  let result: any;

  try {
    switch (action.actionType) {
      case 'webhook':
        result = await executeWebhook(action.config, execContext);
        break;
      case 'url':
        result = executeUrl(action.config, execContext);
        break;
      case 'javascript':
        result = executeJavaScript(action.config, execContext);
        break;
      default:
        return NextResponse.json({ error: 'نوع إجراء غير معروف' }, { status: 400 });
    }
  } catch (error) {
    console.error('Action execution error:', error);
    result = {
      success: false,
      message: error instanceof Error ? error.message : 'فشل تنفيذ الإجراء',
      toast: { message: 'فشل تنفيذ الإجراء', type: 'error' },
    };
  }

  await logAudit(
    context.userId,
    context.email,
    'custom_action',
    action.id,
    'updated',
    [{ field: 'contactId', newValue: contactId }, { field: 'success', newValue: String(result.success) }],
    context.tenantId,
  );

  return NextResponse.json(result);
});
