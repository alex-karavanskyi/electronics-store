export const homeData = products => ({
  categories: [...new Set(products.map(product => product.category))],
  featured: products
    .slice(0, 5)
    .map(({ id, name, image }) => ({ id, name, image })),
})
