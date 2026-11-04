import psycopg
from psycopg.rows import dict_row
from .config import DATABASE_URL


def load_history():
    """Read-only aggregate: no names, messages, photos or credentials exported."""
    if not DATABASE_URL:
        raise RuntimeError('DATABASE_URL absent du service IA')
    with psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10) as connection:
        connection.execute('SET TRANSACTION READ ONLY')
        connection.execute("SET LOCAL statement_timeout = '30s'")
        rows = connection.execute('''
            SELECT l.id_catalogue AS article, to_char(d.date_demande, 'YYYY-MM') AS month,
                   SUM(l.quantite_liste_demande)::float8 AS quantity
            FROM liste_demande l JOIN demande_client d USING (id_demande_client)
            WHERE d.date_demande < date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
            GROUP BY l.id_catalogue, to_char(d.date_demande, 'YYYY-MM')
            ORDER BY month, article
        ''').fetchall()
    return rows
