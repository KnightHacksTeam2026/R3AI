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
        '''Store one item using the 2D packing model and return whether it was stored.'''
        # Get the orientation of the item
        if orientation is None:
            return False

        x_dim, y_dim, z_dim = orientation
        self.x_available -= x_dim
        self.y_available -= y_dim
        self.available_weight -= item.weight
        self.contained_items.append(item)
        return True

    def storeItems(self, item_list: list[Item]):
        '''Store as many items as possible with 2D DP under a fixed z limit.'''
        # The starting state represents what space is available
        start_state = (
            self.x_available,
            self.y_available,
            self.available_weight)

        # Orientation map represents the list of possible orientations for all items
        orientation_map = [item.orientations() for item in item_list]
        item_count = len(item_list)

        # Dynamic programming list that contains dictionaries of data per item
        # Initialize the dp with the start state at 0
        dp = [{} for _ in range(item_count + 1)]
        parent = [{} for _ in range(item_count + 1)]
        dp[0][start_state] = 0

        for i in range(1, item_count + 1):
            item = item_list[i-1]
            
            # Iterate through each state after adding an item to the robot
            # State: represents the state of the robot at that time (x, y, weight)
            # Count: represents how good that state is (almost like a rating)
            for state, count in dp[i-1].items():
                x_available, y_available, available_weight = state

                existing_skip = dp[i].get(state, -1)
                if count > existing_skip:
                    dp[i][state] = count
                    parent[i][state] = (state, None)

                # Try each orientation for each item
                for orientation in orientation_map[i - 1]:
                    x_dim, y_dim, z_dim = orientation
                    if (
                        item.weight <= available_weight and
                        x_dim <= x_available and
                        y_dim <= y_available and
                        z_dim <= self.z_dim
                    ):
                        # An acceptable item means you must calculate the next available space
                        next_state = (
                            x_available - x_dim,
                            y_available - y_dim,
                            available_weight - item.weight)
                        
                        # Calculate the next count and determine if this set of items
                        # and orientation is better
                        next_count = count + 1
                        existing_take = dp[i].get(next_state, -1)
                        if next_count > existing_take:
                            dp[i][next_state] = next_count
                            parent[i][next_state] = (state, orientation)

        # Get the best state so that we can go backwards and build the contained_items list
        # The very end of dp stores a dictionary with possible states, but iteration is necessary
        # to determine the best state. Find the max, find the state
        best_states = dp[item_count]
        best_state = None
        best_count = -1
        for state, count in best_states.items():
            if count > best_count:
                best_count = count
                best_state = state

        # Go backwards and plan out the items that were chosen
        selected_plan = []
        unstored_items = []
        current_state = best_state
        for i in range(item_count, 0, -1):
            previous_state, orientation = parent[i][current_state]
            
            # If orientation is valid, then add to plan, else add to unstored
            if orientation is not None: selected_plan.append((i-1, orientation))
            else: unstored_items.append(item_list[i-1])
            
            # Update state to the previous state (backwards logic)
            current_state = previous_state

        # Go forward storing the items you found in the selected plan
        for i, orientation in reversed(selected_plan):
            item = item_list[i]
            if not self.storeItem(item, orientation):
                unstored_items.append(item)

        return unstored_items

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