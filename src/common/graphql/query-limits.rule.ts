import {
  ASTVisitor,
  FragmentDefinitionNode,
  GraphQLError,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  ValidationContext,
} from 'graphql';

/**
 * Abuse limits for the public GraphQL endpoint.
 *
 * Per-IP rate limiting bounds how MANY requests an attacker sends; it does
 * nothing about a SINGLE pathological request. One deeply-nested or
 * absurdly-wide query can pin the database on its own. These two validation
 * rules reject such a query before a single resolver runs.
 *
 * Written as plain `graphql` validation rules — no extra dependency.
 */

export const MAX_QUERY_DEPTH = 10;
export const MAX_QUERY_FIELDS = 500;

type Fragments = Record<string, FragmentDefinitionNode>;

interface Walked {
  depth: number;
  fields: number;
}

/**
 * Walk a selection set, expanding fragment spreads. `seen` guards against a
 * cyclic fragment (illegal in GraphQL, but we must not hang if one arrives).
 */
function walk(
  selectionSet: SelectionSetNode | undefined,
  fragments: Fragments,
  depth: number,
  seen: Set<string>,
): Walked {
  if (!selectionSet) return { depth, fields: 0 };

  let maxDepth = depth;
  let fields = 0;

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      // Introspection meta-fields (__typename, __schema) are cheap — don't let
      // them inflate depth, but do count them toward the field budget.
      const isMeta = selection.name.value.startsWith('__');
      fields += 1;
      const child = walk(
        selection.selectionSet,
        fragments,
        isMeta ? depth : depth + 1,
        seen,
      );
      maxDepth = Math.max(maxDepth, child.depth);
      fields += child.fields;
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      if (seen.has(name)) continue; // cycle — already accounted for
      const fragment = fragments[name];
      if (!fragment) continue;
      seen.add(name);
      const child = walk(fragment.selectionSet, fragments, depth, seen);
      seen.delete(name);
      maxDepth = Math.max(maxDepth, child.depth);
      fields += child.fields;
    } else {
      // InlineFragment — same depth, its selections still count.
      const child = walk(selection.selectionSet, fragments, depth, seen);
      maxDepth = Math.max(maxDepth, child.depth);
      fields += child.fields;
    }
  }

  return { depth: maxDepth, fields };
}

/** Collect the document's fragment definitions so spreads can be expanded. */
function fragmentsOf(context: ValidationContext): Fragments {
  const fragments: Fragments = {};
  for (const definition of context.getDocument().definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    }
  }
  return fragments;
}

function measure(
  operation: OperationDefinitionNode,
  fragments: Fragments,
): Walked {
  return walk(operation.selectionSet, fragments, 0, new Set());
}

/**
 * True when every root field is a meta field (`__schema`, `__type`) — i.e. this
 * is an introspection query.
 *
 * Introspection MUST be exempt from these limits: the standard introspection
 * query that GraphiQL (and every codegen tool) sends is ~14 levels deep, because
 * its `TypeRef` fragment nests `ofType` nine times. Capping it at 10 breaks
 * schema fetching entirely.
 *
 * That is safe: introspection is a fixed, server-defined shape over a finite
 * type graph — not an attacker-controlled traversal of our data — and it is
 * turned OFF in production via `introspection: false`, which is the real defence.
 */
function isIntrospectionOperation(operation: OperationDefinitionNode): boolean {
  const fields = operation.selectionSet.selections.filter(
    (s) => s.kind === Kind.FIELD,
  );
  return (
    fields.length > 0 &&
    fields.every((field) => field.name.value.startsWith('__'))
  );
}

/** Rejects a query nested deeper than `maxDepth`. */
export function depthLimit(maxDepth: number = MAX_QUERY_DEPTH) {
  return (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(node: OperationDefinitionNode) {
      if (isIntrospectionOperation(node)) return;
      const { depth } = measure(node, fragmentsOf(context));
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query is too deep: ${depth} exceeds the maximum depth of ${maxDepth}.`,
            { nodes: [node], extensions: { code: 'QUERY_TOO_DEEP' } },
          ),
        );
      }
    },
  });
}

/** Rejects a query requesting more than `maxFields` fields in total. */
export function fieldCountLimit(maxFields: number = MAX_QUERY_FIELDS) {
  return (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(node: OperationDefinitionNode) {
      if (isIntrospectionOperation(node)) return;
      const { fields } = measure(node, fragmentsOf(context));
      if (fields > maxFields) {
        context.reportError(
          new GraphQLError(
            `Query is too large: ${fields} fields exceeds the maximum of ${maxFields}.`,
            { nodes: [node], extensions: { code: 'QUERY_TOO_LARGE' } },
          ),
        );
      }
    },
  });
}
