class Item:

    '''
    The item class is used to identify item and establish where it's located,
    its volume and dimensions, and how heavy it is. These metrics are important since
    the robot will have to determine the best route to get to each item item and
    will have a set volume and weight capacity
    '''

    def __init__(self, x_dim: int, y_dim: int, z_dim: int, x_loc: int, y_loc: int, weight: int):
        # Dimension tracking
        self.x_dim: int = x_dim
        self.y_dim: int = y_dim
        self.z_dim: int = z_dim
        
        # Location tracking
        self.x_loc: int = x_loc
        self.y_loc: int = y_loc
        
        # Weight tracking
        self.weight: int = weight

    def __str__(self):
        return f"Item(item dimensions=({self.x_dim} m, {self.y_dim} m, {self.z_dim} m), item location=({self.x_loc} m, {self.y_loc} m), item weight={self.weight} kg)"

    def orientations(self):
        '''Return all rotations of an item.'''
        return list(set([
            (self.x_dim, self.y_dim, self.z_dim),
            (self.y_dim, self.z_dim, self.x_dim),
            (self.z_dim, self.x_dim, self.y_dim),
            (self.y_dim, self.x_dim, self.z_dim),
            (self.x_dim, self.z_dim, self.y_dim),
            (self.z_dim, self.y_dim, self.x_dim)]))