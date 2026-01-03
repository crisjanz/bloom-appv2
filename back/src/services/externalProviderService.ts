import prisma from '../lib/prisma';

class ExternalProviderService {
  async getAllProviders() {
    return await prisma.externalProvider.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async createProvider(data: { name: string; code: string }) {
    return await prisma.externalProvider.create({ data });
  }

  async updateProvider(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean; sortOrder: number }>
  ) {
    return await prisma.externalProvider.update({
      where: { id },
      data
    });
  }

  async deleteProvider(id: string) {
    return await prisma.externalProvider.delete({ where: { id } });
  }
}

export default new ExternalProviderService();
