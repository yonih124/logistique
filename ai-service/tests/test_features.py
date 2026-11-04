import unittest
from app.features import series, samples, baseline, shift, forecast_next_month


class FeaturesTest(unittest.TestCase):
    def test_next_month_baseline(self):
        self.assertEqual(forecast_next_month([10, 20, 30], '2026-12'), 20)

    def test_recursive_forecast_crosses_year(self):
        class Model:
            def __init__(self):
                self.inputs = []
            def predict(self, rows):
                self.inputs.append(rows[0])
                return [40 if len(self.inputs) == 1 else 50]
        model = Model()
        self.assertEqual(forecast_next_month([10, 20, 30], '2026-12', model), 50)
        self.assertEqual(model.inputs[0][-1], 12)
        self.assertEqual(model.inputs[1][:3], [20, 30, 40])
        self.assertEqual(model.inputs[1][-1], 1)
    def test_excludes_current_month_and_fills_gaps(self):
        rows = [{'article': 1, 'month': '2026-01', 'quantity': 4},
                {'article': 1, 'month': '2026-03', 'quantity': 2},
                {'article': 1, 'month': '2026-04', 'quantity': 999}]
        self.assertEqual(series(rows, '2026-04')[1], [('2026-01', 4), ('2026-02', 0), ('2026-03', 2)])

    def test_features_never_include_target(self):
        rows = samples({1: [('2026-01', 1), ('2026-02', 2), ('2026-03', 3), ('2026-04', 900)]})
        self.assertEqual(rows, [('2026-04', [1, 2, 3, 2, 4], 900)])

    def test_calendar_and_empty_history(self):
        self.assertEqual(shift('2026-12', 1), '2027-01')
        self.assertEqual(baseline([]), 0)
        self.assertEqual(series([], '2026-04'), {})
