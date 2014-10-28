/*
 * Chart constructor
 */
var Chart = {};

(function (Chart) {
	var DEFAULTS = {
		margin: { top: 20, bottom: 20, left: 30, right: 20 },
		limit: 20,
		// color: 'dodgerblue',
		duration: 500
	};

	var SCALE_TYPES = ['linear', 'time', 'ordinal'];

	var _Chart = function (options) {
		var scope = this;

		var clientRect;

		if (!options) {
			throw Error('See docs');
		}
		
		// SVG container
		scope.container = options.container || d3.select('body');
		clientRect = scope.container.node().getBoundingClientRect();

		// Chart margin
		scope.margin = options.margin || DEFAULTS.margin;

		// Init dimensions
		scope.width = (options.width || clientRect.width) -
			scope.margin.left - scope.margin.right;

		scope.height = (options.height || (clientRect.height || clientRect.width * 0.3)) -
			scope.margin.top - scope.margin.bottom;

		// Chart settings
		scope.title = options.title;
		// scope.color = options.color || DEFAULTS.color;
		scope.limit = options.limit || DEFAULTS.limit;
		scope.duration = options.duration || DEFAULTS.duration;

		// x, y options
		scope.x = options.x;
		scope.y = options.y;

		scope.data = options.data || [];

		// Init color picker
		scope.colors = d3.scale.category10();

		return scope;
	};

	var AxisChart = function (options) {
		_Chart.apply(this, arguments);
	};

	_.extend(AxisChart.prototype, {
		/*
		 * TODO: Render comment
		 */
		render: function () {
			var scope = this;

			// Render main canvas
			scope.canvas = d3.select(scope.container.node())
				.append('svg')
				.attr('width', scope.width + scope.margin.left + scope.margin.right)
				.attr('height', scope.height + scope.margin.top + scope.margin.bottom)
					.append('g')
					.classed('canvas', true)
					.attr('transform',
						'translate(' + [scope.margin.left, scope.margin.top] + ')');

			scope.canvas.append('defs')
				.append('clipPath')
				.attr('id', 'clip')
					.append('rect')
					.attr('width', scope.width)
					.attr('height', scope.height);

			// Render chart title
			scope.canvas
				.append('text')
				.classed('chart-title', true)
				.text(scope.title)
				.attr('x', scope.width / 2)
				.style('text-anchor', 'middle');

			// Init scales
			scope.xScale = scope.scale(scope.x, true);
			scope.yScale = scope.scale(scope.y);

			// Init axes
			scope.xAxis = d3.svg.axis()
				.orient('bottom')
				.ticks(5)
				.scale(scope.xScale);

			scope.yAxis = d3.svg.axis()
				.orient('left')
				.ticks(5)
				.scale(scope.yScale);

			// Render axis
			scope.gxAxis = scope.canvas
				.append('g')
				.classed('axis x', true)
				.attr('transform', 'translate(' + [0, scope.height] +')')
				.call(scope.xAxis);

			scope.gxAxis
				.append('text')
				.classed('x-label', true)
				.attr('x', scope.width)
				.attr('y', -6)
				.style('text-anchor', 'end')
				.text(scope.x.label);

			scope.gyAxis = scope.canvas
				.append('g')
				.classed('axis y', true)
				.call(scope.yAxis);

			scope.gyAxis
				.append('text')
				.classed('y-label', true)
				.attr('transform', 'rotate(-90)')
				.attr('y', 6)
				.attr('dy', '.71em')
				.style('text-anchor', 'end')
				.text(scope.y.label);

			return scope;
		},

		/*
		 * TODO: Update comment
		 */
		update: function () {
			var scope = this;

			// update scales
			scope.xScale.domain(scope.domain(scope.x, true));
			scope.yScale.domain(scope.domain(scope.y));

			// update axis
			scope.gxAxis
				.transition()
				.duration(scope.duration)
					.call(scope.xAxis);

			scope.gyAxis
				.transition()
				.duration(scope.duration)
					.call(scope.yAxis);

			return scope;
		},

		/**************** Helpers ****************/
		scale: function (options, x) {
			var scope = this;
			var range = x ? [0, scope.width] : [scope.height, 0];
			
			var scale;

			switch(SCALE_TYPES.indexOf(options.type)) {
				case 0:
					// linear
					scale = d3.scale.linear()
						.domain(scope.domain(options))
						.range(range);
					break;
				case 1:
					// time
					scale = d3.time.scale()
						.domain(scope.domain(options))
						.range(range);
					break;
				case 2:
					// ordinal
					scale = d3.scale.ordinal()
						.domain(scope.domain(options))
						.rangeRoundBands(range, 0.1);
					break;
				default:
					// throw error otherwise
					throw Error('Invalid axis type', options.type);
			}

			return scale;
		},

		domain: function (options) {
			var scope = this;
			var keys = _.keys(scope.data);

			var min,
				max,
				domain;

			if (!keys.length) {
				return options.type === 'time' ?
					[new Date(), new Date()] : [0, 1];
			}

			if (options.type === 'time' || options.type === 'linear') {
				_.each(keys, function (key) {
					var extent = d3.extent(scope.data[key], function (d) {
						return d[options.key];
					});

					if (typeof min == 'undefined') {
						min = extent[0];
						max = extent[1];
					} else {
						if (extent[0] < min) {
							min = extent[0];
						}

						if (extent[1] > max) {
							max = extent[1];
						}
					}
				});

				return [min, max];
			} else if (options.type === 'ordinal') {
				domain = [];

				_.each(keys, function (key) {
					domain = _.union(domain, scope.data[key]);
				});

				return domain;
			} else {
				throw Error('Invalid axis type', options.type);
			}
		}
	});

	var Line = function (options) {
		AxisChart.apply(this, arguments);
	};

	_.extend(Line.prototype, AxisChart.prototype, {
		/*
		 * TODO comment
		 */
		render: function () {
			var scope = this;

			var keys = _.keys(scope.data);
			var values = _.values(scope.data);

			AxisChart.prototype.render.apply(scope, arguments);

			scope.line = d3.svg.line()
				.x(function (d) { return scope.xScale(d[scope.x.key]); })
				.y(function (d) { return scope.yScale(d[scope.y.key]); });


			var clip = scope.canvas
				.append('g')
				.attr('clip-path', 'url(#clip)');

			scope.paths = clip
				.selectAll('.line')
				.data(values);

			// update

			// enter
			scope.paths
				.enter()
				.append('path')
				.classed('line', true)
				.attr('id', function (d, i) {
					return keys[i];
				})
				.style('stroke-opacity', 0)
				.style('stroke', function (d, i) {
					return scope.colors(i);
				})
				.attr('d', function (d) {
					var data = d.map(function (point) {
						var obj = {};
						obj[scope.x.key] = point[scope.x.key];
						obj[scope.y.key] = 0;
						return obj;
					});

					return scope.line(data);
				})
				.transition()
				.duration(scope.duration)
					.attr('d', scope.line)
					.style('stroke-opacity', 1);



			// exit

			/*scope.path = scope.canvas
				.append('g')
				.attr('clip-path', 'url(#clip)')
					.append('path')
					.classed('line', true)
					.style('stroke-opacity', 0)
					.style('stroke', scope.color)
					.attr('d', scope.line(scope.data.map(function (d) {
						var obj = {};
						obj[scope.x.key] = d[scope.x.key];
						obj[scope.y.key] = 0;

						return obj;
					})));

			scope.path
				.datum(scope.data)
				.transition()
				.duration(500)
					.attr('d', scope.line)
					.style('stroke-opacity', 1);*/

			return scope;
		},

		/*
		 * Todo: comment
		 */
		update: function (data) {
			var scope = this;
			var keys = _.keys(data);
			
			var length,
				slide,
				point,
				copy,
				dx;

			/*scope.paths
				.data(_.values(scope.data))
				.attr('d', function (d) {
					return scope.line(d);
				});*/

			// If no data do nothing
			if (!data) {
				return;
			}

			slide = false;
			_.each(keys, function (key) {


				var l = scope.data[key].length +
					(_.isArray(data[key]) ? data[key].length : 1);

				if (l > scope.limit) {
					slide = true;
				}
			});

			// Caluclate length of new data
			// length = data.length || 1;

			// Translate path to the left if length of
			// data greater than limit
			// slide = scope.data.length + length > scope.limit;

			// Update chart
			if (slide) {
				// Limit is reached
				// Slide chart to the left
				copy = {};
				_.each(_.keys(scope.data), function (key) {
					var l,
						newData;

					copy[key] = [];

					// Clone data
					_.each(scope.data[key], function (point) {
						copy[key].push(_.clone(point));
					});

					// Merge new data
					newData = data[key];

					if (_.isArray(newData)) {
						_.each(newData, function (point) {
							copy[key].push(point);
							scope.data[key].push(point);
						});
					} else {
						copy[key].push(newData);
						scope.data[key].push(newData);
					}
				});

				// Remove extra points
				var last;
				var first;
				var chartId;

				_.each(scope.data, function (d, id) {
					var l = d.length - scope.limit;
					var point;
					
					if (l > 0) {
						d.splice(0, l);
					}

					point = _.last(d);

					if (!last) {
						last = point;
						chartId = id
					} else if (point[scope.x.key] > last[scope.x.key]) {
						last = point;
						chartId = id;
					}
				});

				first = scope.data[chartId][0];

				_.each(scope.data, function (d, id) {
					var done;

					if (id !== chartId) {
						while(!done) {
							if (d[0][scope.x.key] < first[scope.x.key]) {
								d.shift();
							} else {
								done = true;
							}
						}
					}
				});

				// Render path
				scope.paths
					.data(_.values(copy))
					.attr('d', function (d) {
						return scope.line(d);
					});

				// Update scales/axes
				AxisChart.prototype.update.apply(scope, arguments);

				// Update path according to new
				// scales and axes
				scope.paths
					.data(_.values(copy))
					.transition()
					.duration(scope.duration)
						.attr('d', function (d) {
							return scope.line(d);
						});
			} else {
				// Limit is not reached
				// Add new points;
				_.each(keys, function (key) {
					_.each(data[key], function (d) {
						if (_.isArray(d)) {
							_.each(d, function (point) {
								scope.data[key].push(point);
							});
						} else {
							scope.data[key].push(d);
						}
					});
				});

				scope.paths
					.attr('d', scope.line);

				AxisChart.prototype.update.apply(this, arguments);

				scope.paths
					.transition()
					.duration(scope.duration)
						.attr('d', scope.line);
			}

			return scope;
		}
	});

	Chart.Line = Line;
})(Chart);