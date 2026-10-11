from Logic.R3_BOT.item import Item
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

class Robot:
    
    '''
    The robot class models a 2D packing area with a fixed z-height limit.
    Items may be rotated, but only x and y space are consumed when items
    are stored. The z dimension is used only as a fit constraint.
    '''

    def __init__(self, x_dim: int, y_dim: int, z_dim: int, weight_capacity: int, life: float):
        # Volume and current space information
        self.x_dim: int = x_dim
        self.y_dim: int = y_dim
        self.z_dim: int = z_dim
        self.x_available: int = x_dim
        self.y_available: int = y_dim
        
        # Weight capacity
        self.weight_capacity: int = weight_capacity
        self.available_weight: int = weight_capacity
        
        # Current battery life
        self.life: float = life
        self.current_life: float = life

        # List of item the robot has
        self.contained_items: list[Item] = []

    def __str__(self):
        return f"Robot(available space=({self.x_available} m, {self.y_available} m), z limit={self.z_dim} m, available weight={self.available_weight} kg, battery life={self.current_life} V)"

    def reset(self):
        '''Resets the bot to its original state with full capacity and no item'''
        self.x_available = self.x_dim
        self.y_available = self.y_dim
        self.available_weight = self.weight_capacity
        self.contained_items = []

    def storeItem(self, item: Item, orientation=None):
        '''Store one item using the selected orientation and return whether it was stored.'''
        if orientation is None:
            return False

        x_dim, y_dim, z_dim = orientation
        if (
            item.weight > self.available_weight or
            x_dim > self.x_available or
            y_dim > self.y_available or
            z_dim > self.z_dim
        ):
            return False

        self.x_available -= x_dim
        self.y_available -= y_dim
        self.available_weight -= item.weight
        self.contained_items.append(item)
        return True

    def _valid_orientations(self, item: Item):
        return [orientation for orientation in item.orientations() if orientation[2] <= self.z_dim]

    def _choose_placement(self, item: Item, free_rectangles: list[tuple[int, int, int, int]]):
        '''Best-short-side-fit heuristic over free rectangles.'''
        best = None
        for orientation in self._valid_orientations(item):
            width, height, _ = orientation
            for rect_index, (_, _, rect_width, rect_height) in enumerate(free_rectangles):
                if width > rect_width or height > rect_height:
                    continue
                short_side = min(rect_width - width, rect_height - height)
                long_side = max(rect_width - width, rect_height - height)
                waste = rect_width * rect_height - width * height
                score = (short_side, long_side, waste, -width * height)
                if best is None or score < best[0]:
                    best = (score, rect_index, orientation)
        return best

    def _split_free_rectangles(self, free_rectangles: list[tuple[int, int, int, int]], used_rect: tuple[int, int, int, int]):
        used_x, used_y, used_width, used_height = used_rect
        next_rectangles = []
        for rect_x, rect_y, rect_width, rect_height in free_rectangles:
            if (
                used_x >= rect_x + rect_width or
                used_x + used_width <= rect_x or
                used_y >= rect_y + rect_height or
                used_y + used_height <= rect_y
            ):
                next_rectangles.append((rect_x, rect_y, rect_width, rect_height))
                continue

            if used_x > rect_x:
                next_rectangles.append((rect_x, rect_y, used_x - rect_x, rect_height))
            if used_x + used_width < rect_x + rect_width:
                next_rectangles.append((used_x + used_width, rect_y, rect_x + rect_width - (used_x + used_width), rect_height))
            if used_y > rect_y:
                next_rectangles.append((rect_x, rect_y, rect_width, used_y - rect_y))
            if used_y + used_height < rect_y + rect_height:
                next_rectangles.append((rect_x, used_y + used_height, rect_width, rect_y + rect_height - (used_y + used_height)))

        pruned = []
        for index, rect in enumerate(next_rectangles):
            if rect[2] <= 0 or rect[3] <= 0:
                continue
            contained = False
            for other_index, other in enumerate(next_rectangles):
                if index == other_index:
                    continue
                if (
                    rect[0] >= other[0] and rect[1] >= other[1] and
                    rect[0] + rect[2] <= other[0] + other[2] and
                    rect[1] + rect[3] <= other[1] + other[3]
                ):
                    contained = True
                    break
            if not contained:
                pruned.append(rect)
        return pruned

    def storeItems(self, item_list: list[Item]):
        '''Store as many items as possible with a 2D free-rectangle packing heuristic.'''
        free_rectangles = [(0, 0, self.x_available, self.y_available)]
        packed: list[tuple[int, tuple[int, int, int]]] = []
        unstored_items = []
        remaining_weight = self.available_weight

        candidate_indices = sorted(
            range(len(item_list)),
            key=lambda index: (
                -max((orientation[0] * orientation[1] for orientation in self._valid_orientations(item_list[index])), default=0),
                -item_list[index].weight,
            ),
        )

        for index in candidate_indices:
            item = item_list[index]
            if item.weight > remaining_weight:
                unstored_items.append(item)
                continue

            placement = self._choose_placement(item, free_rectangles)
            if placement is None:
                unstored_items.append(item)
                continue

            _, rect_index, orientation = placement
            rect_x, rect_y, _, _ = free_rectangles[rect_index]
            width, height, _ = orientation
            used_rect = (rect_x, rect_y, width, height)
            free_rectangles = self._split_free_rectangles(free_rectangles, used_rect)
            remaining_weight -= item.weight
            packed.append((index, orientation))

        packed_indices = {index for index, _ in packed}
        unstored_items.extend(item for index, item in enumerate(item_list) if index not in packed_indices and item not in unstored_items)

        used_width = sum(orientation[0] for _, orientation in packed)
        used_height = sum(orientation[1] for _, orientation in packed)
        self.x_available = max((rect[2] for rect in free_rectangles), default=self.x_dim - min(self.x_dim, used_width))
        self.y_available = max((rect[3] for rect in free_rectangles), default=self.y_dim - min(self.y_dim, used_height))
        self.available_weight = remaining_weight
        self.contained_items = [item_list[index] for index, _ in packed]
        return unstored_items

    def planCollectionRuns(self, items: list[Item], starting_x=0.0, starting_y=0.0):
        '''Plan successive loads from one scan, returning pickup runs and human-only items.

        Each run starts empty at the same base. Planning simulates unloading via
        reset; the frontend replays these runs without generating new trash.
        '''
        remaining = list(items)
        runs = []
        self.reset()
        try:
            while remaining:
                unstored = self.storeItems(remaining)
                if not self.contained_items:
                    # Nothing fits even in an empty robot; retrying cannot help.
                    break
                runs.append(self.getPath(starting_x, starting_y))
                remaining = unstored
                self.reset()
            return runs, remaining
        finally:
            self.reset()

    def getPath(self, starting_x: float=0.0, starting_y: float=0.0):
        '''Implements OSRM API logic for getting the quickest path between items'''
        if len(self.contained_items) <= 1:
            return list(self.contained_items)

        coords = [(starting_x, starting_y)]
        for item in self.contained_items:
            coords.append((item.x_loc, item.y_loc))

        coord_string = ";".join(f"{x},{y}" for x, y in coords)
        url = (
            "https://router.project-osrm.org/trip/v1/driving/"
            f"{coord_string}?source=first&roundtrip=false&steps=false&overview=false")
        data = fetch_json(url)

        if "waypoints" not in data or len(data["waypoints"]) != len(coords):
            raise ValueError("OSRM did not return a valid waypoint ordering.")

        waypoint_order = []
        for input_index, waypoint in enumerate(data["waypoints"]):
            waypoint_order.append({
                "input_index": input_index,
                "waypoint_index": waypoint["waypoint_index"],
            })

        return [
            self.contained_items[waypoint["input_index"] - 1]
            for waypoint in sorted(
                (waypoint for waypoint in waypoint_order if waypoint["input_index"] != 0),
                key=lambda waypoint: waypoint["waypoint_index"]
            )
        ]

def fetch_json(url: str):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "R3AI-Robot/1.0",
        },
    )

    try:
        with urlopen(request) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        try:
            body = json.loads(error.read().decode("utf-8"))
            message = body.get("message") or body.get("code") or f"status {error.code}"
        except Exception:
            message = f"status {error.code}"
        raise ValueError(f"OSRM request failed: {message}.") from error
    except URLError as error:
        raise ValueError(f"OSRM request failed: {error.reason}.") from error

    if body.get("code") != "Ok":
        message = body.get("message") or body.get("code") or "unknown error"
        raise ValueError(f"OSRM request failed: {message}.")

    return body

if __name__ == "__main__":
    import random
    
    item_list = []
    for i in range(10):
        item = Item(
            random.randint(1, 9),
            random.randint(1, 9),
            random.randint(1, 4),
            random.randint(1, 9),
            random.randint(1, 9),
            random.randint(1, 9)
        )
        item_list.append(item)
    
    robot = Robot(15, 15, 3, 20, 100) # 10 x 10 x 2 m^3, 100 kg

    uncontained_items = robot.storeItems(item_list)
    print("Before:")
    for item in item_list:
        print("\t" + str(item))
    print("\nAfter:")
    print("Unstored:")
    for item in uncontained_items:
        print("\t" + str(item))
    print("Stored:")
    for item in robot.contained_items:
        print("\t" + str(item))
    print("Robot state:")
    print(str(robot))