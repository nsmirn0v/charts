/*
 * Chart constructor
 */
var Chart = {};

(function (Chart) {
	var DEFAULTS = {
		margin: { top: 20, bottom: 20, left: 30, right: 20 },
		limit: 20,
		color: 'dodgerblue',
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

		// chart settings
		scope.title = options.title;
		scope.color = options.color || DEFAULTS.color;
		scope.limit = options.limit || DEFAULTS.limit;
		scope.duration = options.duration || DEFAULTS.duration;

		// x, y options
		scope.x = options.x;
		scope.y = options.y;

		scope.data = options.data || [];

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

		/*
		 * TODO: Reset comment
		 */
		reset: function () {
			
		},

		/*
		 * TODO: destroy comment
		 */
		destroy: function () {
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

			if (!scope.data.length) {
				return options.type === 'time' ?
					[new Date(), new Date()] : [0, 1];
			} else if (scope.data.length === 1) {
				return [scope.data[0][options.key], scope.data[0][options.key]];
			}

			if (options.type === 'time' || options.type === 'linear') {
				return d3.extent(scope.data, function (d) {
					return d[options.key];
				});
			} else if (options.type === 'ordinal') {
				return scope.data.map(function (d) {
					return d[options.key];
				});
			} else {
				throw Error('Invalid axis type', options.type);
			}
		}
	});

	var Line = function (options) {
		AxisChart.apply(this, arguments);
	};

	_.extend(Line.prototype, AxisChart.prototype, {

		render: function () {
			var scope = this;

			AxisChart.prototype.render.apply(scope, arguments);

			scope.line = d3.svg.line()
				.x(function (d) { return scope.xScale(d[scope.x.key]); })
				.y(function (d) { return scope.yScale(d[scope.y.key]); });

			scope.path = scope.canvas
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
					.style('stroke-opacity', 1);

			return scope;
		},

		/*
		 * Todo: comment
		 */
		update: function (data) {
			var scope = this;
			
			var length,
				slide,
				point,
				copy,
				dx;

			// If no data or empty array do nothing
			if (!data || (_.isArray(data) && !data.length)) {
				return;
			}

			// Caluclate length of new data
			length = data.length || 1;

			// Translate path to the left if length of
			// data greater than limit
			slide = scope.data.length + length > scope.limit;

			// Update chart
			if (slide) {
				// Limit is reached
				// Slide chart to the left
				copy = [];
				_.each(scope.data, function (d, i) {
					copy.push(_.clone(d));
				});

				if (data.length) {
					_.each(data, function (d) {
						copy.push(d);
						scope.data.push(d);
					});
				} else {
					copy.push(data);
					scope.data.push(data);
				}

				// Remove extra points
				scope.data.splice(0, length);

				// Render path
				scope.path
					.attr('d', scope.line(copy));

				// Update scales/axes
				AxisChart.prototype.update.apply(scope, arguments);

				// Calculate dx - distance to which
				// path will be translated to the left
				point = copy[length];
				dx = scope.xScale(point[scope.x.key]);

				// Update path according to new
				// scales and axes
				scope.path
					.transition()
					.duration(scope.duration)
						.attr('transform', 'translate(' + [dx, 0] + ')')
						.attr('d', scope.line(copy));
			} else {
				// Limit is not reached
				// Add new points;
				if (data.length) {
					_.each(data, function (d) {
						scope.data.push(d);
					});
				} else {
					scope.data.push(data);
				}

				scope.path
					.attr('d', scope.line);

				AxisChart.prototype.update.apply(this, arguments);

				scope.path
					.transition()
					.duration(scope.duration)
						.attr('d', scope.line);
			}

			return scope;
		}

	});

	Chart.Line = Line;
})(Chart);