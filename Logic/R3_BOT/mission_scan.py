import json
import math
import random
import sys
from pathlib import Path
from uuid import uuid4

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from Logic.R3_BOT.item import Item
from Logic.R3_BOT.robot import Robot

CATEGORIES = [
    "Plastic packaging",
    "Mixed paper",
    "Glass bottles",
    "Aluminum cans",
    "Mixed litter",
]


def random_item_location(start_lon: float, start_lat: float, radius_miles: float):
    angle = random.uniform(0, 2 * math.pi)
    radius = radius_miles * math.sqrt(random.random())
    delta_x_miles = radius * math.cos(angle)
    delta_y_miles = radius * math.sin(angle)
    lat = start_lat + (delta_y_miles / 69.0)
    lon_scale = max(0.2, math.cos(math.radians(start_lat)))
    lon = start_lon + (delta_x_miles / (69.0 * lon_scale))
    return lon, lat


def density_for_item(item: Item):
    footprint = item.x_dim * item.y_dim
    if footprint < 12:
        return "sparse"
    if footprint < 30:
        return "moderate"
    return "dense"


def build_item_record(item_id: str, item: Item, area_name: str, category: str, pickup_rank: int | None):
    return {
        "id": item_id,
        "category": category,
        "longitude": item.x_loc,
        "latitude": item.y_loc,
        "xDim": item.x_dim,
        "yDim": item.y_dim,
        "zDim": item.z_dim,
        "weightKg": item.weight,
        "itemCount": 1,
        "density": density_for_item(item),
        "area": area_name,
        "pickupRank": pickup_rank,
        "stored": pickup_rank is not None,
    }


def main():
    payload = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    area_id = payload.get("areaId", "ORL")
    area_name = payload.get("areaName", area_id)
    start_lon = float(payload.get("startLongitude", -81.3755))
    start_lat = float(payload.get("startLatitude", 28.5422))
    item_count = int(payload.get("itemCount", 12))
    scan_radius_miles = float(payload.get("scanRadiusMiles", 10.0))
    robot_id = payload.get("botId", f"R3-{area_id}-G01")

    robot = Robot(
        int(payload.get("robotXDim", 15)),
        int(payload.get("robotYDim", 15)),
        int(payload.get("robotZDim", 3)),
        int(payload.get("weightCapacityKg", 20)),
        float(payload.get("life", 100.0)),
    )

    scan_id = uuid4().hex
    items: list[Item] = []
    item_ids: dict[int, str] = {}
    item_categories: dict[int, str] = {}
    for index in range(item_count):
        longitude, latitude = random_item_location(start_lon, start_lat, scan_radius_miles)
        item = Item(
            random.randint(1, 9),
            random.randint(1, 9),
            random.randint(1, 4),
            longitude,
            latitude,
            random.randint(1, 9),
        )
        items.append(item)
        item_ids[id(item)] = f"{robot_id}-{scan_id}-T{index + 1:02d}"
        item_categories[id(item)] = CATEGORIES[index % len(CATEGORIES)]

    runs, unstored_items = robot.planCollectionRuns(items, start_lon, start_lat)
    pickup_order = [item for run in runs for item in run]
    pickup_rank = {
        id(item): rank + 1
        for rank, item in enumerate(pickup_order)
    }

    response = {
        "botId": robot_id,
        "areaId": area_id,
        "areaName": area_name,
        "startLongitude": start_lon,
        "startLatitude": start_lat,
        "routeCoordinates": [[start_lon, start_lat]] + [[item.x_loc, item.y_loc] for item in pickup_order],
        "items": [
            build_item_record(
                item_ids[id(item)],
                item,
                area_name,
                item_categories[id(item)],
                pickup_rank.get(id(item)),
            )
            for item in items
        ],
        "runs": [
            {
                "pickupOrderIds": [item_ids[id(item)] for item in run],
                "routeCoordinates": [[start_lon, start_lat]] + [
                    [item.x_loc, item.y_loc] for item in run
                ],
            }
            for run in runs
        ],
        "storedItemIds": [item_ids[id(item)] for item in pickup_order],
        "unstoredItemIds": [item_ids[id(item)] for item in unstored_items],
        "humanRequiredItemIds": [item_ids[id(item)] for item in unstored_items],
        "pickupOrderIds": [item_ids[id(item)] for item in pickup_order],
        "robotState": {
            "xAvailable": robot.x_available,
            "yAvailable": robot.y_available,
            "availableWeight": robot.available_weight,
            "weightCapacityKg": robot.weight_capacity,
            "zLimit": robot.z_dim,
            "life": robot.life,
        },
    }
    json.dump(response, sys.stdout)


if __name__ == "__main__":
    main()
