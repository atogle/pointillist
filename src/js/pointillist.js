var Pointillist = Pointillist || {};

(function(P) {
  var mercator = new GlobalMercator();

  function merge(o1, o2) {
    for (var key in o2) { o1[key] = o2[key]; }
    return o1;
  }

  P.Tree = function(o) {
    var options = merge({
          initBounds: [24.521000, -124.762520, 49.384472, -66.932640],
          minZoom: 4,
          maxZoom: 6
        }, o),
        mSw = mercator.LatLonToMeters(options.initBounds[0], options.initBounds[1]),
        mNe = mercator.LatLonToMeters(options.initBounds[2], options.initBounds[3]),
        tSw = mercator.MetersToTile(mSw[0], mSw[1], options.minZoom),
        tNe = mercator.MetersToTile(mNe[0], mNe[1], options.minZoom),
        x, y;

    P.Cell.prototype.maxZoom = options.maxZoom;

    this.topCells = [];
    for (x=tSw[0]; x<=tNe[0]; x++) {
      for (y=tSw[1]; y<=tNe[1]; y++) {
        this.topCells.push(new P.Cell(x, y, options.minZoom));
      }
    }
  };

  P.Cell = function(x, y, z, parent) {
    this.z = z;
    this.y = y;
    this.x = x;

    this.bounds = mercator.TileBounds(this.x, this.y, this.z);
    this.latLonBounds = mercator.TileLatLonBounds(this.x, this.y, this.z);

    this.count = 0;
    this.expanded = false;

    // console.log('Making cell ', x, y, z, this.getLatLonCenter());

    this.parent = parent;
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

    // hehe
    makeChildren: function() {
      var childZ, ne, se, sw, nw;

      if (this.z < this.maxZoom) {

        childZ = this.z+1;
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

        // console.log('adding to ', this.x, this.y, this.z);
        // console.log('expanded ', this.expanded);
      }
    },

    canExpand: function() {
      return !this.parent || (this.count > 0 && this.parent.expanded && this.children.length > 0);
    },

    expand: function() {}
  };
})(Pointillist);