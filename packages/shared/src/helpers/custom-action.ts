export function replaceVariables(template: string, context: Record<string, any>): string {
  const regex = /\{\{([^}]+)\}\}/g;

  return template.replace(regex, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return match;
      }
      value = value[part];
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return JSON.stringify(value);
  });
}

export function buildActionContext(
  contact: {
    id: string;
    phoneNumber: string;
    profileName: string;
    tags: string[];
    metadata: Record<string, any>;
  },
  user: {
    id: string;
    fullName: string;
    email: string;
  },
  organization: {
    id: string;
    name: string;
  },
): Record<string, any> {
  return {
    contact: {
      id: contact.id,
      phone_number: contact.phoneNumber,
      name: contact.profileName,
      profile_name: contact.profileName,
      tags: contact.tags,
      metadata: contact.metadata,
    },
    user: {
      id: user.id,
      name: user.fullName,
      email: user.email,
    },
    organization: {
      id: organization.id,
      name: organization.name,
    },
  };
}


