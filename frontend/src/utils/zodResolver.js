import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { appendErrors } from 'react-hook-form';

/**
 * Universal Zod Resolver compatible with both Zod v3 and Zod v4.
 * Correctly extracts validation issues from `error.issues` (Zod v4) or `error.errors` (Zod v3),
 * preventing silent crashes in React Hook Form's handleSubmit.
 */
const parseErrors = (issuesList, validateAllFieldCriteria) => {
  const issues = [...issuesList];
  const errors = {};
  while (issues.length) {
    const issue = issues[0];
    const code = issue.code || 'custom';
    const message = issue.message || 'Validation failed';
    const path = issue.path && issue.path.length > 0 ? issue.path.join('.') : 'root';

    if (!errors[path]) {
      if ('unionErrors' in issue && issue.unionErrors?.[0]?.issues) {
        const u = issue.unionErrors[0].issues[0];
        errors[path] = { message: u.message, type: u.code };
      } else {
        errors[path] = { message, type: code };
      }
    }

    if ('unionErrors' in issue && Array.isArray(issue.unionErrors)) {
      issue.unionErrors.forEach((ue) => {
        const subIssues = ue.issues || ue.errors || [];
        subIssues.forEach((si) => issues.push(si));
      });
    }

    if (validateAllFieldCriteria) {
      const types = errors[path].types;
      const prev = types && types[code];
      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        code,
        prev ? [].concat(prev, message) : message
      );
    }
    issues.shift();
  }
  return errors;
};

export const zodResolver = (schema, schemaOptions = {}, resolverOptions = {}) => {
  return async (values, _context, options = {}) => {
    try {
      const parsed = await schema[resolverOptions.mode === 'sync' ? 'parse' : 'parseAsync'](
        values,
        schemaOptions
      );
      if (options.shouldUseNativeValidation) {
        validateFieldsNatively({}, options);
      }
      return { values: resolverOptions.raw ? values : parsed, errors: {} };
    } catch (error) {
      const issues = Array.isArray(error?.issues)
        ? error.issues
        : Array.isArray(error?.errors)
        ? error.errors
        : null;

      if (issues) {
        return {
          values: {},
          errors: toNestErrors(
            parseErrors(issues, !options.shouldUseNativeValidation && options.criteriaMode === 'all'),
            options
          ),
        };
      }
      throw error;
    }
  };
};

export default zodResolver;
