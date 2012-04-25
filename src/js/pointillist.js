var Pointillist = Pointillist || {};

(function(P) {
  // Helper for doing ll, xy, and tile coordinate conversions
  var mercator = new GlobalMercator();

  // Util for merging object literals
  function merge(o1, o2) {
    for (var key in o2) { o1[key] = o2[key]; }
    return o1;
  }

  // A collection of Cell objects
  P.Tree = function(o) {
    // Default options
    var options = merge({
          initBounds: [24.521000, -124.762520, 49.384472, -66.932640],
          minZoom: 4,
          maxZoom: 6
        }, o),
        // Bounds in mercator meters
        mSw = mercator.LatLonToMeters(options.initBounds[0], options.initBounds[1]),
        mNe = mercator.LatLonToMeters(options.initBounds[2], options.initBounds[3]),
        // Bounds in tile coordinates
        tSw = mercator.MetersToTile(mSw[0], mSw[1], options.minZoom),
        tNe = mercator.MetersToTile(mNe[0], mNe[1], options.minZoom),
        x, y;

    // Set the maxZoom on the cells
    P.Cell.prototype.maxZoom = options.maxZoom;

    // Init the top level cells for the given bounding box
    this.topCells = [];
    for (x=tSw[0]; x<=tNe[0]; x++) {
      for (y=tSw[1]; y<=tNe[1]; y++) {
        this.topCells.push(new P.Cell(x, y, options.minZoom));
      }
    }
  };

  // A cell that maps to the xyz of a mercator tile
  P.Cell = function(x, y, z, parent) {
    this.z = z;
    this.y = y;
    this.x = x;

    // Mercator Bounds
    this.bounds = mercator.TileBounds(this.x, this.y, this.z);
    // LatLon Bounds
    this.latLonBounds = mercator.TileLatLonBounds(this.x, this.y, this.z);

    // How many points have been added to this cell
    this.count = 0;
    // Has this cell been expanded?
    this.expanded = false;

    // console.log('Making cell ', x, y, z, this.getLatLonCenter());

    // The parent of this cell
    this.parent = parent;
    // The children of this cell, always 4 of them
    this.children = this.makeChildren();
  };

  P.Cell.prototype = {
    getLatLonCenter: function() {
      var mx = (this.bounds[0] + this.bounds[2]) / 2,
          my = (this.bounds[1] + this.bounds[3]) / 2;

      return mercator.MetersToLatLon(mx, my, this.z);
    },

    getRadius: function() {
      return (this.bounds[3] - this.bounds[1]) / Math.pow(4, this.z);
    },

    makeChildren: function() {
      var childZ, ne, se, sw, nw;

      // Only make children if I'm less than the max zoom
      if (this.z < this.maxZoom) {
        childZ = this.z+1;
        // Convert the corners of the mercator bounds to tile coordinates
        // Adjusting by 1 to get off the border.
        ne = mercator.MetersToTile(this.bounds[2]-1, this.bounds[3]-1, childZ);
        se = mercator.MetersToTile(this.bounds[2]-1, this.bounds[1]+1, childZ);
        sw = mercator.MetersToTile(this.bounds[0]+1, this.bounds[1]+1, childZ);
        nw = mercator.MetersToTile(this.bounds[0]+1, this.bounds[3]-1, childZ);

        return [
          new P.Cell(ne[0], ne[1], childZ, this),
          new P.Cell(se[0], se[1], childZ, this),
          new P.Cell(sw[0], sw[1], childZ, this),
          new P.Cell(nw[0], nw[1], childZ, this)
        ];
      } else {
        return [];
      }
    },

    containsLatLon: function(lat, lon) {
      return (
        lat >= this.latLonBounds[0] && lat <= this.latLonBounds[2] &&
        lon >= this.latLonBounds[1] && lon <= this.latLonBounds[3]
      );
    },

    addPoint: function(lat, lon) {
      var i, len = this.children.length;

      // Don't add a point unless the point is within my bounds
      if (this.containsLatLon(lat, lon)) {

        // Add the point to the child also
        for(i=0; i<len; i++) {
          this.children[i].addPoint(lat, lon);
        }

        // Count this point
        this.count++;

        this.onAdd();

        // Expand if appropriate
        if (!this.expanded && this.canExpand()) {
          this.expand();
          this.expanded = true;
        }

        // console.log('adding to ', this.x, this.y, this.z);
        // console.log('expanded ', this.expanded);
      }
    },

    // A cell can expand if:
    //   - it doesn't have a parent (top level) OR
    //   - its parent is expanded AND it has a count AND it has children to expand into
    canExpand: function() {
      return !this.parent || (this.count > 0 && this.parent.expanded && this.children.length > 0);
    },

    // No op function that can be overridden
    expand: function() {},

    // No op function that can be overridden
    onAdd: function() {}
  };
})(Pointillist);