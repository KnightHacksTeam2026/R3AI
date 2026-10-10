from item import Item
import sys

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

    @property
    def packing_area(self):
        return self.x_dim * self.y_dim

    def __str__(self):
        return f"Robot(available space=({self.x_available} m, {self.y_available} m), z limit={self.z_dim} m, available weight={self.available_weight} kg, battery life={self.current_life} V)"

    def reset(self):
        '''Resets the bot to its original state with full capacity and no item'''
        self.x_available = self.x_dim
        self.y_available = self.y_dim
        self.available_weight = self.weight_capacity
        self.contained_items = []

    def best_orientation_for_2d_space(self, item: Item):
        '''Return the rotation that best fits the remaining 2D space and z limit.'''
        if item.weight > self.available_weight:
            return None

        # Store the best orientation and remaining space
        best_orientation = None
        best_remaining_space = None
        for orientation in item.orientations():
            x_dim, y_dim, z_dim = orientation
            if x_dim <= self.x_available and y_dim <= self.y_available and z_dim <= self.z_dim:
                remaining_space = (
                    self.x_available - x_dim,
                    self.y_available - y_dim)
                if best_remaining_space is None or remaining_space > best_remaining_space:
                    best_remaining_space = remaining_space
                    best_orientation = orientation

        return best_orientation

    def isWithinZLimit(self, item: Item):
        '''Helper function that determines if the item is within the z limit'''
        return (
            item.x_dim < self.z_dim or
            item.y_dim < self.z_dim or
            item.z_dim < self.z_dim)

    def fits(self, item: Item):
        '''Determine whether the item fits in the remaining 2D space and z limit.'''
        return self.best_orientation_for_2d_space(item) is not None

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
            item = item_list[i - 1]
            
            # Iterate through each state after adding an item to the robot
            # State: represents the state of the robot at that time (x, y, weight)
            # Count: represents how good that state is (almost like a rating)
            for state, count in dp[i - 1].items():
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
        current_state = best_state
        for i in range(item_count, 0, -1):
            previous_state, orientation = parent[i][current_state]
            if orientation is not None:
                selected_plan.append((i - 1, orientation))
            current_state = previous_state

        # Go forward storing the items you found in the selected plan
        unstored_items = []
        for i, orientation in reversed(selected_plan):
            item = item_list[i]
            if not self.storeItem(item, orientation):
                unstored_items.append(item)

        return unstored_items

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
    
    robot = Robot(10, 10, 2, 10, 100) # 10 x 10 x 2 m^3, 100 kg
    
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