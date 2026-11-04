export function baseValidation(catalogue) {
  const stock = catalogue.Stock.reduce((total, row) => total + row.quantite_stock, 0);
  return Math.floor(Math.max(0, stock) * catalogue.pourcentage_demande_max / 100);
}

export function proposerQuantites(lignes) {
  const restants = new Map();
  return lignes.map(line => {
    if (!restants.has(line.id_catalogue)) restants.set(line.id_catalogue, baseValidation(line.Catalogue));
    const quantite_proposee = Math.min(line.quantite_liste_demande, restants.get(line.id_catalogue));
    restants.set(line.id_catalogue, restants.get(line.id_catalogue) - quantite_proposee);
    return { ...line, quantite_proposee };
  });
}
