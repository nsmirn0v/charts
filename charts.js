/*
 * Chart constructor
 */
var Chart = {};

(function (Chart) {
	var DEFAULTS = {
		margin: { top: 20, bottom: 20, left: 30, right: 20 },
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

		scope.contWidth = clientRect.width;

		// Chart margin
		scope.margin = options.margin || DEFAULTS.margin;

		// Init dimensions
		scope.width = (options.width || clientRect.width) -
			scope.margin.left - scope.margin.right;

		scope.height = (options.height || (clientRect.width * 0.2)) -
			scope.margin.top - scope.margin.bottom;

		// Chart settings
		scope.title = options.title;
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
					.attr('height', scope.height)
					.on('mouseover', scope.mouseover)
					.on('mousemove', scope.mousemove)
					.on('mouseout', scope.mouseout);

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
		 * TODO comment
		 */
		resize: function () {
			var scope = this;

			scope.width = scope.contWidth -
				scope.margin.left - scope.margin.right;

			scope.xScale
				.range([0, scope.width]);

			scope.gxAxis
				.attr('transform', 'translate(' + [0, scope.height] + ')')
				.call(scope.xAxis);

			return scope;
		},

		/*
		 * TODO comment
		 */
		scale: function (options, x) {
			var scope = this;
			var range = x ? [0, scope.width] : [scope.height - 1, 0];
			
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

		/*
		 * TODO comment
		 */
		domain: function (options) {
			var scope = this;
			// var keys = _.keys(scope.data);

			var min,
				max,
				domain;

			if (!scope.data.length) {
				return options.type === 'time' ?
					[new Date(), new Date()] : [0, 1];
			}

			if (options.type === 'time' || options.type === 'linear') {
				_.each(scope.data, function (chart) {
					var extent = d3.extent(chart.data, function (d) {
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

				if (options == scope.y) {
					max += max * 0.1;
				}

				return [min, max];
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

			AxisChart.prototype.render.apply(scope, arguments);

			scope.line = d3.svg.line()
				.x(function (d) { return scope.xScale(d[scope.x.key]); })
				.y(function (d) { return scope.yScale(d[scope.y.key]); });

			scope.clip = scope.canvas
				.append('g')
				.attr('clip-path', 'url(#clip)');

			scope.paths = scope.clip
				.selectAll('.line')
				.data(scope.data, function (d) {
					return d.id;
				});

			// enter
			scope.paths
				.enter()
				.append('path')
				.classed('line', true)
				.attr('id', function (chart) {
					return chart.id;
				})
				.style('stroke-opacity', 0)
				.style('stroke', function (chart) {
					return chart.color || scope.colors(chart.id);
				})
				.attr('d', function (chart) {
					var data = chart.data.map(function (point) {
						var obj = {};
						obj[scope.x.key] = point[scope.x.key];
						obj[scope.y.key] = 0;
						return obj;
					});

					return scope.line(data);
				})
				.transition()
				.duration(scope.duration)
					.attr('d', function (chart) {
						return scope.line(chart.data);
					})
					.style('stroke-opacity', 1);

			// init mouse events
			scope.mouse();

			// subscribe to resize
			scope.resize();

			return scope;
		},

		/*
		 * Todo: comment
		 */
		update: function (newData) {
			var scope = this;
			
			var copy,
				makeCopy;

			// If no data do nothing
			if (!newData ||
				(_.isArray(newData) && !newData.length)) {
				return;
			}

			if (!newData.length) {
				newData = [newData];
			}

			copy = this.formatData(newData);

			// Render paths
			scope.paths
				.data(copy, function (chart) {
					return chart.id;
				})
				.attr('d', function (chart) {
					return scope.line(chart.data);
				});

			// Update scales/axes
			AxisChart.prototype.update.apply(scope, arguments);

			// Update path according to new
			// scales and axes
			scope.paths
				.transition()
				.duration(scope.duration)
					.attr('d', function (chart) {
						return scope.line(chart.data);
					});

			return scope;
		},

		/*
		 * Todo comment
		 */
		add: function (data) {
			var scope = this;

			// Do nothing if no data
			if (!data ||
				(_.isArray(data) && !data.length)) {
				return;
			}

			if (!data.length) {
				data = [data];
			}

			// Merge old and new data
			_.each(data, function (chart) {
				var c = _.findWhere(scope.data, {
					id: chart.id
				});
				
				if (c) {
					throw Error('Chart with id ' +
						chart.id + ' already exists!');
				}

				scope.data.push({
					id: chart.id,
					color: chart.color,
					data: []
				});
			});

			// bind updated data
			scope.paths = scope.clip
				.selectAll('.line')
				.data(scope.data, function (chart) {
					return chart.id;
				});

			// enter
			scope.paths
				.enter()
				.append('path')
				.classed('line', true)
				.attr('id', function (chart) {
					return chart.id;
				})
				.style('stroke', function (chart) {
					return chart.color || scope.colors(chart.id);
				});

			return scope.update(data);
		},

		/*
		 * TODO comment
		 */
		remove: function (ids) {
			var scope = this;

			if (!ids ||
				(_.isArray(ids) && !ids.length)) {
				return;
			}

			if (!_.isArray(ids)) {
				ids = [ids];
			}

			// Remove data for specified ids
			scope.data = _.reject(scope.data, function (chart) {
				return ids.indexOf(chart.id) >= 0;
			});

			// Update scales/axis
			AxisChart.prototype.update.apply(scope, arguments);

			// Upate charts
			scope.paths = scope.clip
				.selectAll('.line')
				.data(scope.data, function (chart) {
					return chart.id;
				});

			// update
			scope.paths
				.transition()
				.duration(scope.duration)
					.attr('d', function (chart) {
						return scope.line(chart.data);
					});

			// update
			scope.paths
				.exit()
				.transition()
				.duration(scope.duration)
					.style('stroke-opacity', 0)
					.attr('d', function (chart) {
						var data = chart.data.map(function (point) {
							var obj = {};
							obj[scope.x.key] = point[scope.x.key];
							obj[scope.y.key] = 0;

							return obj;
						});

						return scope.line(data);
					})
					.remove();
		},

		/*
		 * TODO comment
		 */
		formatData: function (newData) {
			var scope = this;

			var copy,
				first,
				last;

			copy = [];

			_.each(scope.data, function (chart) {
				var chartClone = {
					id: chart.id,
					data: []
				};

				var chartToMerge = _.findWhere(newData, {
					id: chart.id
				});

				// Create deep copy of chart.data
				_.each(chart.data, function (point) {
					chartClone.data.push(_.clone(point));
				});

				// Merge old and new data
				if (chartToMerge && chartToMerge.data.length) {
					_.each(chartToMerge.data, function (point) {
						chartClone.data.push(point);
						chart.data.push(point);
					});
				}

				copy.push(chartClone);
			});

			return copy;
		},

		/*
		 * TODO comment
		 */
		resize: function () {
			var scope = this;

			scope.resizeId = setInterval(function () {
				var width = scope.container.node()
					.getBoundingClientRect().width;

				if (scope.contWidth != width) {
					scope.contWidth = width;

					AxisChart.prototype.resize.apply(scope, arguments);

					scope.canvas
						.select('#clip rect')
						.attr('width', scope.width);

					scope.paths
						.attr('d', function (chart) {
							return scope.line(chart.data);
						});
				}
			}, 30);
		},

		/*
		 * TODO comment
		 */
		destroy: function () {
			var scope = this;
			var svg = scope.canvas.node().parentNode;

			clearInterval(scope.resizeId);

			d3.select(svg)
				.transition()
				.duration(scope.duration)
					.attr('height', 0)
					.style('opacity', 0)
					.remove();
		},

		mouse: function () {
			var scope = this;

			this.hover = scope.canvas
				.append('rect')
				.attr('width', scope.width)
				.attr('height', scope.height)
				.style('fill', 'rgba(0,0,0,0.0001)')
				.on('mousemove', scope.mousemove)
				.on('mousemove', scope.mousemove)
				.on('mouseout', scope.mouseout);
		},

		/*
		 * TODO comment
		 */
		mouseover: function () {
			console.debug('mouseover');
		},

		mousemove: function () {
			console.debug('mousemove');
		},

		mouseout: function () {
			console.debug('mouseout');
		}
	});

	Chart.Line = Line;
})(Chart);