const slugify = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

export const filterActiveCategories = (nodes = []) => {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((node) => node?.isActive !== false)
    .map((node) => ({
      ...node,
      slug: node.slug || slugify(node.name || ""),
      children: filterActiveCategories(node.children || []),
    }));
};

export const flattenCategories = (nodes = []) => {
  const result = [];

  const traverse = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      result.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };

  traverse(nodes);
  return result;
};

export const findCategoryBySlug = (nodes = [], slug = "") => {
  if (!slug) return null;

  for (const node of nodes) {
    if (node.slug === slug) {
      return node;
    }
    if (node.children?.length) {
      const match = findCategoryBySlug(node.children, slug);
      if (match) return match;
    }
  }

  return null;
};

export const collectDescendantIds = (category) => {
  if (!category) return [];
  const ids = [category.id];

  if (Array.isArray(category.children)) {
    category.children.forEach((child) => {
      ids.push(...collectDescendantIds(child));
    });
  }

  return ids;
};

export const buildCategoryUrl = (topSlug, childSlug) => {
  if (!topSlug) return "/shop";
  if (childSlug) return `/shop/${topSlug}/${childSlug}`;
  return `/shop/${topSlug}`;
};
