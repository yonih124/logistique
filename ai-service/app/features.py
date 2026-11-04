from datetime import datetime, timezone


def current_month():
    return datetime.now(timezone.utc).strftime('%Y-%m')


def shift(month, offset):
    year, number = map(int, month.split('-'))
    index = year * 12 + number - 1 + offset
    return '%04d-%02d' % (index // 12, index % 12 + 1)


def series(rows, cutoff):
    result = {}
    for row in rows:
        if row['month'] < cutoff:
            result.setdefault(int(row['article']), {})[row['month']] = float(row['quantity'])
    for article, values in result.items():
        month = min(values)
        filled = []
        while month < cutoff:
            filled.append((month, values.get(month, 0.0)))
            month = shift(month, 1)
        result[article] = filled
    return result


def baseline(history):
    return sum(history[-3:]) / len(history[-3:]) if history else 0.0


def features(history, month):
    return [*history[-3:], baseline(history), int(month[-2:])]


def forecast_next_month(history, cutoff, model=None):
    # The current month is incomplete: estimate it first, never insert a fake zero.
    if model is None:
        return baseline(history)
    current = max(0.0, float(model.predict([features(history, cutoff)])[0]))
    return max(0.0, float(model.predict([features(history + [current], shift(cutoff, 1))])[0]))


def samples(histories):
    rows = []
    for values in histories.values():
        for index in range(3, len(values)):
            month, quantity = values[index]
            rows.append((month, features([v for _, v in values[:index]], month), quantity))
    return rows
