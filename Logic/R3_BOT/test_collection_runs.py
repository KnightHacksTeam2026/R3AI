import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from Logic.R3_BOT.item import Item
from Logic.R3_BOT.robot import Robot
from Logic.R3_BOT import mission_scan


class CollectionRunsTests(unittest.TestCase):
    def setUp(self):
        self.robot = Robot(4, 4, 2, 4, 100)
        self.collectable = [Item(2, 2, 2, index, 1, 2) for index in range(8)]
        self.human = [Item(5, 5, 5, 9, 1, 1), Item(1, 1, 1, 10, 1, 5)]

    def test_all_collectable_items_across_four_loads(self):
        items = self.collectable + self.human
        calls = []

        def route(robot, x, y):
            calls.append((x, y, robot.available_weight))
            return list(reversed(robot.contained_items))

        with patch.object(Robot, 'getPath', autospec=True, side_effect=route):
            runs, remaining = self.robot.planCollectionRuns(items, -81, 28)
        self.assertEqual([len(run) for run in runs], [2, 2, 2, 2])
        self.assertEqual(calls, [(-81, 28, 0)] * 4)
        collected = [item for run in runs for item in run]
        self.assertCountEqual(collected, self.collectable)
        self.assertEqual(len({id(item) for item in collected}), 8)
        self.assertCountEqual(remaining, self.human)
        self.assertEqual(items, self.collectable + self.human)
        self.assert_empty()

    def assert_empty(self):
        self.assertEqual(self.robot.contained_items, [])
        self.assertEqual((self.robot.x_available, self.robot.y_available, self.robot.available_weight), (4, 4, 4))
        self.assertEqual(self.robot.z_dim, 2)

    def test_empty_and_all_impossible_terminate_without_routing(self):
        with patch.object(Robot, 'getPath') as route:
            self.assertEqual(self.robot.planCollectionRuns([]), ([], []))
            runs, remaining = self.robot.planCollectionRuns(self.human)
            self.assertEqual(runs, [])
            self.assertCountEqual(remaining, self.human)
            route.assert_not_called()
        self.assert_empty()

    def test_routing_error_resets_robot_and_propagates(self):
        with patch.object(Robot, 'getPath', side_effect=ValueError('OSRM unavailable')):
            with self.assertRaisesRegex(ValueError, 'OSRM unavailable'):
                self.robot.planCollectionRuns(self.collectable)
        self.assert_empty()

    def test_rotation_with_fixed_height_across_runs(self):
        robot = Robot(7, 3, 2, 3, 100)
        items = [Item(2, 6, 2, 0, 0, 2) for _ in range(3)]
        runs, remaining = robot.planCollectionRuns(items)
        self.assertEqual([len(run) for run in runs], [1, 1, 1])
        self.assertEqual(remaining, [])
        self.assertEqual((robot.x_available, robot.y_available, robot.available_weight), (7, 3, 3))

    def test_osrm_is_used_for_each_multi_item_run(self):
        responses = []

        def fetch(url):
            responses.append(url)
            return {'code': 'Ok', 'waypoints': [
                {'waypoint_index': 0}, {'waypoint_index': 2}, {'waypoint_index': 1},
            ]}

        with patch('Logic.R3_BOT.robot.fetch_json', side_effect=fetch):
            runs, _ = self.robot.planCollectionRuns(self.collectable, -81, 28)
        self.assertEqual(len(responses), 4)
        self.assertTrue(all('/trip/v1/driving/-81,28;' in url for url in responses))
        self.assertEqual(sum(map(len, runs)), 8)

    def test_response_keeps_human_items_separate_from_later_loads(self):
        payload = {'itemCount': 10, 'robotXDim': 4, 'robotYDim': 4,
                   'robotZDim': 2, 'weightCapacityKg': 4}
        output = io.StringIO()
        with patch('sys.stdin', io.StringIO(json.dumps(payload))), \
             patch.object(mission_scan, 'Item', side_effect=self.collectable + self.human), \
             patch.object(Robot, 'getPath', autospec=True,
                          side_effect=lambda robot, x, y: list(robot.contained_items)), \
             redirect_stdout(output):
            mission_scan.main()
        data = json.loads(output.getvalue())
        self.assertEqual(len(data['runs']), 4)
        self.assertEqual(len(data['items']), 10)
        self.assertEqual(len(data['storedItemIds']), 8)
        self.assertEqual(len(data['humanRequiredItemIds']), 2)
        self.assertEqual(data['unstoredItemIds'], data['humanRequiredItemIds'])
        self.assertEqual(data['robotState']['availableWeight'], 4)
        self.assertEqual([item_id for run in data['runs'] for item_id in run['pickupOrderIds']], data['pickupOrderIds'])
        self.assertTrue(all(run['routeCoordinates'][0] == [-81.3755, 28.5422] for run in data['runs']))


if __name__ == '__main__':
    unittest.main()
