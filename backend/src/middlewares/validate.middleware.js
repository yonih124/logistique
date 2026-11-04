import { AppError } from "../utils/AppError.js";

export const validate = (schema) => {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(
        new AppError(
          "Données invalides",
          400,
          result.error.flatten()
        )
      );
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    /*
     * Il ne faut pas supprimer les paramètres existants
     * comme :resource.
     */
    if (result.data.params !== undefined) {
      req.params = {
        ...req.params,
        ...result.data.params,
      };
    }

    /*
     * req.query est en lecture seule avec Express 5.
     * Les données validées restent disponibles ici.
     */
    req.validated = {
      ...result.data,
      params: {
        ...req.params,
        ...result.data.params,
      },
    };

    next();
  };
};