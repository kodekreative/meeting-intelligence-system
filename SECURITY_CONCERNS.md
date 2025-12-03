# Security Concerns

## Critical: Default Encryption Key

The file `apps/api/src/services/microsoft-auth.service.ts` contains a default encryption key:

`const key = process.env.ENCRYPTION_KEY || 'default_key_change_in_production'`

This is a major security vulnerability. If this key is not changed in a production environment, an attacker could potentially decrypt user access tokens and gain access to their calendar data.

**Recommendation:**

1.  Generate a new, strong encryption key. You can use the `generate-encryption-key.js` file in the root of the project to do this:

    ```bash
    node generate-encryption-key.js
    ```

2.  Set the `ENCRYPTION_KEY` environment variable to the new key in your production environment. **Do not commit the key to your git repository.**
