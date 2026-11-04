import { prisma } from "../config/prisma.js";

export function creerCrudService(modelName, idField, options = {}) {
  const model = prisma[modelName];
  const orderBy = options.orderBy ?? { [idField]: "desc" };

  return {
    lister() {
      return model.findMany({ orderBy });
    },

    obtenir(id) {
      return model.findUnique({ where: { [idField]: id } });
    },

    creer(data) {
      return model.create({ data });
    },

    modifier(id, data) {
      return model.update({ where: { [idField]: id }, data });
    },

    supprimer(id) {
      return model.delete({ where: { [idField]: id } });
    },
  };
}
