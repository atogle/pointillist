var Pointillist = Pointillist || {};

(function(P) {
  var options = {
        rootX: 0,
        rootY: 1,
        rootZ: 1,
        maxZoom: 6
      },
      self = {};

  P.Cell = function(x, y, z, parent) {
    this.z = z;
    this.y = y;
    this.x = x;

    this.bounds = this.mercator.TileBounds(this.x, this.y, this.z);
    this.latLonBounds = this.mercator.TileLatLonBounds(this.x, this.y, this.z);

    this.count = 0;
    this.expanded = false;

    console.log('Making cell ', x, y, z, this.getLatLonCenter());

    this.parent = parent;
    this.children = this.makeChildren();
  };

  P.Cell.prototype = {
    mercator: new GlobalMercator(),
    maxZoom: options.maxZoom,

    getLatLonCenter: function() {
      var mx = (this.bounds[0] + this.bounds[2]) / 2,
          my = (this.bounds[1] + this.bounds[3]) / 2;

      return this.mercator.MetersToLatLon(mx, my, this.z);
    },

    getRadius: function() {
      return (this.bounds[3] - this.bounds[1]) / Math.pow(4, this.z);
    },

    // hehe
    makeChildren: function() {
      var childZ, ne, se, sw, nw;

      if (this.z < this.maxZoom) {

        childZ = this.z+1;
        ne = this.mercator.MetersToTile(this.bounds[2]-1, this.bounds[3]-1, childZ);
        se = this.mercator.MetersToTile(this.bounds[2]-1, this.bounds[1]+1, childZ);
        sw = this.mercator.MetersToTile(this.bounds[0]+1, this.bounds[1]+1, childZ);
        nw = this.mercator.MetersToTile(this.bounds[0]+1, this.bounds[3]-1, childZ);

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

    contains: function(lat, lon) {
      return (
        lat >= this.latLonBounds[0] && lat <= this.latLonBounds[2] &&
        lon >= this.latLonBounds[1] && lon <= this.latLonBounds[3]
      );
    },

    addPoint: function(lat, lon) {
      var i, len = this.children.length;

      if (this.contains(lat, lon)) {
        for(i=0; i<len; i++) {
          this.children[i].addPoint(lat, lon);
        }

        this.count++;
        if (!this.expanded && this.canExpand()) {
          this.expand();
          this.expanded = true;
        }

        console.log('adding to ', this.x, this.y, this.z);
        console.log('expanded ', this.expanded);
      }
    },

    canExpand: function() {
      return !this.parent || (this.count > 0 && this.parent.expanded && this.children.length > 0);
    },

    expand: function() {}
  };

  P.root = new P.Cell(options.rootX, options.rootY, options.rootZ, null);
})(Pointillist);