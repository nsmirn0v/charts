/*
 * Chart constructor
 */
var Chart = {};

(function (Chart) {
	var DEFAULTS = {
		margin: { top: 20, bottom: 30, left: 30, right: 20 },
		duration: 500
	};

	var SCALE_TYPES = ['linear', 'time', 'ordinal'];

	/*
	 * Main chart constructor
	 */
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
		if (options.width) {
			scope.maxWidth = options.width;
		}

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

		// bisector for tooltip
		scope.bisector = d3.bisector(function (d) {
			return d[scope.x.key];
		}).left;

		// Init color picker
		scope.colors = d3.scale.category10();

		return scope;
	};

	_.extend(_Chart.prototype, {
		/*
		 * TODO comment
		 */
		isLineChart: function () {
			return this.chartType === 'line';
		},

		isAreaChart: function () {
			return this.chartType === 'area';
		},

		isScatterPlot: function () {
			return this.chartType === 'scatter';
		},

		isBarChart: function () {
			return this.chartType === 'bar';
		}
	});

	/*
	 * Chart with x, y axes inherit from this AxisChart
	 * Defines/renders/updates exes
	 */
	var AxisChart = function (options) {
		_Chart.apply(this, arguments);
	};

	_.extend(AxisChart.prototype, _Chart.prototype, {
		/*
		 * TODO: Render comment
		 */
		render: function () {
			var scope = this;

			// create svg container
			scope.svg = d3.select(scope.container.node())
				.append('svg')
				.attr('width', scope.width +
					scope.margin.left + scope.margin.right)
				.attr('height', scope.height +
					scope.margin.top + scope.margin.bottom);

			// Render main canvas
			scope.canvas = scope.svg
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
			scope.svg
				.append('text')
				.classed('chart-title', true)
				.text(scope.title)
				.attr('x', scope.width / 2 + scope.margin.left)
				.attr('y', scope.margin.top / 2)
				.style('text-anchor', 'middle');

			// Append tooltip values container
			scope.tValuesGroup = scope.canvas
				.append('g')
				.classed('t-values', true)
				.attr('transform', 'translate(' + [20, 0] + ')');

			// Create chart legend
			scope.updateLegend();

			// Init scales
			scope.xScale = scope.scale(scope.x, true);
			scope.yScale = scope.scale(scope.y);

			// Init axes
			scope.xAxis = d3.svg.axis()
				.orient('bottom')
				.ticks(5)
				.scale(scope.xScale);

			if (scope.isBarChart()) {
				scope.xAxis
					.tickFormat(function (time) {
						return scope.x.tick.format(time);
					});
			}

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

			if (scope.isBarChart()) {
				scope.gxAxis
					.selectAll('text')
					.attr('transform', 'rotate(' + scope.x.tick.rotate + ')')
					.style('text-anchor', scope.x.tick.rotate ? 'end' : 'middle')
					.style('dy', scope.x.tick.rotate ? '0' : '-5px');
			}

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

			scope.clip = scope.canvas
				.append('g')
				.attr('clip-path', 'url(#clip)');

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

			if (scope.maxWidth && scope.width > scope.maxWidth) {
				scope.width = scope.maxWidth -
					scope.margin.left - scope.margin.right;
			}

			// update svg container
			scope.svg
				.attr('width', scope.width +
					scope.margin.left + scope.margin.right);

			scope.xScale
				.range([0, scope.width]);

			scope.gxAxis
				.attr('transform', 'translate(' + [0, scope.height] + ')')
				.call(scope.xAxis);

			// Update chart title possition
			scope.svg
				.select('.chart-title')
				.attr('x', scope.width / 2 + scope.margin.left);

			// Update x-label
			scope.gxAxis
				.select('.x-label')
				.attr('x', scope.width);

			// Update legend
			scope.updateLegend();

			return scope;
		},

		/*
		 * TODO comment
		 */
		scale: function (options, x) {
			var scope = this;
			var range = x ? [0, scope.width] : [scope.height - 1, 0];

			if (scope.isBarChart() && x) {
				return d3.scale.ordinal()
					.domain(scope.domain(options, x))
					.rangeRoundBands(range, 0.08);
			} else if (options.type === 'time') {
				return d3.time.scale()
					.domain(scope.domain(options, x))
					.range(range);
			} else {
				return d3.scale.linear()
					.domain(scope.domain(options))
					.range(range);
			}
		},

		/*
		 * TODO comment
		 */
		domain: function (options, x) {
			var scope = this;

			var min,
				max,
				domain;

			if (!scope.data.length) {
				return options.type === 'time' ?
					[new Date(), new Date()] : [0, 1];
			}

			if (scope.isLineChart() ||
				scope.isAreaChart() ||
				scope.isScatterPlot() ||
				(scope.isBarChart() && !x)) {
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
			} else if (scope.isBarChart()) {
				domain = [];

				_.each(scope.data, function (chart) {
					domain = _.union(domain, chart.data.map(function (point) {
						return point[options.key];
					}));
				});

				return domain;
			} else {
				throw Error('Invalid axis type', options.type);
			}
		},

		updateLegend: function () {
			var scope = this;

			if (!scope.legend) {
				scope.legend = scope.svg
					.append('g')
					.classed('legend', true);
			}

			scope.legend
				.attr('transform', 'translate(' +
					[(scope.margin.left + scope.width) / 2,
					scope.height + scope.margin.top + 20] + ')');

			var lItems = scope.legend
				.selectAll('.l-item')
				.data(scope.data, function (chart) {
					return chart.id;
				});

			// enter
			lItems
				.enter()
				.append('g')
				.classed('l-item', true)
				.each(function (d, i) {
					var group,
						siblings,
						offset;

					siblings = this.parentNode.childNodes;
					offset = 0;

					for (var j = 0; j < i; j++) {
						offset += siblings[j].getBBox().width + 10;
					}

					group = d3.select(this)
						.style('opacity', 0);

					group.append('rect')
						.attr('width', 10)
						.attr('height', 10)
						.attr('rx', 2)
						.style('fill', d.color || scope.colors(d.id));

					group.append('text')
						.attr('x', 12)
						.attr('dy', '.8em')
						.text(d.id);

					group
						.transition()
						.duration(100)
							.style('opacity', 1)
							.attr('transform',
								'translate(' + [offset, 0] + ')');
				});

			// update
			lItems
				.each(function (d, i) {
					var siblings,
						offset;

					siblings = this.parentNode.childNodes;
					offset = 0;

					for (var j = 0; j < i; j++) {
						offset += siblings[j].getBBox().width + 10;
					}

					d3.select(this)
						.transition()
						.duration(100)
							.style('opacity', 1)
							.attr('transform',
								'translate(' + [offset, 0] + ')');
				});

			// exit
			lItems
				.exit()
				.remove();
		},

		/*
		 * TODO comment
		 */
		formatData: function (newData) {
			var scope = this;

			var dataCopy,
				first,
				last;

			dataCopy = [];

			_.each(scope.data, function (chart) {
				var chartClone = {
					id: chart.id,
					color: chart.color,
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

				dataCopy.push(chartClone);
			});

			return dataCopy;
		}
	});
	
	/*
	 * Line chart constructor
	 */
	var Line = function (options) {
		AxisChart.apply(this, arguments);
		this.chartType = 'line';
	};

	_.extend(Line.prototype, AxisChart.prototype, {
		/*
		 * TODO comment
		 */
		render: function () {
			var scope = this;

			AxisChart.prototype.render.apply(scope, arguments);

			// Add line
			if (scope.isLineChart() || scope.isAreaChart()) {
				scope.line = d3.svg.line()
					.x(function (d) { return scope.xScale(d[scope.x.key]); })
					.y(function (d) { return scope.yScale(d[scope.y.key]); });

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
			}

			// Add area
			if (scope.isAreaChart()) {
				// Init area generator
				scope.area = d3.svg.area()
					.x(function (d) {
						return scope.xScale(d[scope.x.key]);
					})
					.y0(function (d) {
						return scope.yScale(0);
					})
					.y1(function (d) {
						return scope.yScale(d[scope.y.key]);
					});

				scope.areaPaths = scope.clip
					.selectAll('.area')
					.data(scope.data, function (d) {
						return d.id;
					});

				// enter
				scope.areaPaths
					.enter()
					.append('path')
					.classed('area', true)
					.attr('id', function (chart) {
						return chart.id;
					})
					.style('fill', function (chart) {
						return chart.color || scope.colors(chart.id);
					})
					.attr('d', function (chart) {
						var data = chart.data.map(function (point) {
							var obj = {};
							obj[scope.x.key] = point[scope.x.key];
							obj[scope.y.key] = 0;
							return obj;
						});

						return scope.area(data);
					})
					.transition()
					.duration(scope.duration)
						.attr('d', function (chart) {
							return scope.area(chart.data);
						});
			}

			if (scope.isScatterPlot()) {
				scope.scatterGroups = scope.clip
					.selectAll('.scatter')
					.data(scope.data, function (chart) {
						return chart.id;
					});

				scope.scatterGroups
					.enter()
					.append('g')
					.classed('scatter', true)
					.each(function (chart) {
						var group = d3.select(this);

						group
							.selectAll('.s-circle')
							.data(chart.data)
							.enter()
							.append('circle')
							.classed('s-circle', true)
							.attr('cx', function (point) {
								return scope.xScale(point[scope.x.key]);
							})
							.attr('cy', function () {
								return scope.yScale(0);
							})
							.attr('r', 0)
							.style('fill',
								chart.color || scope.colors(chart.id))
							.style('opacity', 0)
							.transition()
							.duration(scope.duration)
								.attr('cy', function (point) {
									return scope.yScale(point[scope.y.key]);
								})
								.attr('r', 3)
								.style('opacity', 1);
					});

			}

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
			
			var dataCopy;

			// If no data do nothing
			if (!newData ||
				(_.isArray(newData) && !newData.length)) {
				return;
			}

			if (!newData.length) {
				newData = [newData];
			}

			dataCopy = scope.formatData(newData);

			if (scope.isLineChart() || scope.isAreaChart()) {
				// Render paths
				scope.paths
					.data(dataCopy, function (chart) {
						return chart.id;
					})
					.attr('d', function (chart) {
						return scope.line(chart.data);
					});
			}

			if (scope.isAreaChart()) {
				scope.areaPaths
					.data(dataCopy, function (chart) {
						return chart.id;
					})
					.attr('d', function (chart) {
						return scope.line(chart.data);
					});
			}

			if (scope.isScatterPlot()) {
				scope.scatterGroups
					.data(dataCopy, function (chart) {
						return chart.id;
					})
					.each(function (chart) {
						var group = d3.select(this);
						var circles;

						circles = group
							.selectAll('.s-circle')
							.data(chart.data);

						// enter
						circles
							.enter()
							.append('circle')
							.classed('s-circle', true)
							.attr('cx', function (point) {
								return scope.xScale(point[scope.x.key]);
							})
							.attr('cy', function (point) {
								return scope.yScale(point[scope.y.key]);
							})
							.attr('r', 3)
							.style('fill',
								chart.color || scope.colors(chart.id));

						// update
						circles
							.attr('cx', function (point) {
								return scope.xScale(point[scope.x.key]);
							})
							.attr('cy', function (point) {
								return scope.yScale(point[scope.y.key]);
							});

						// exit
						circles
							.exit()
							.remove();
					});
			}

			// Update scales/axes
			AxisChart.prototype.update.apply(scope, arguments);

			if (scope.isLineChart() || scope.isAreaChart()) {
				// Update path according to new
				// scales and axes
				scope.paths
					.transition()
					.duration(scope.duration)
						.attr('d', function (chart) {
							return scope.line(chart.data);
						});
			}

			if (scope.isAreaChart()) {
				scope.areaPaths
					.transition()
					.duration(scope.duration)
						.attr('d', function (chart) {
							return scope.area(chart.data);
						});
			}

			if (scope.isScatterPlot()) {
				scope.scatterGroups
					.each(function (chart) {
						var group = d3.select(this);

						group
							.selectAll('.s-circle')
							.transition()
							.duration(scope.duration)
								.attr('cx', function (point) {
									return scope.xScale(point[scope.x.key]);
								})
								.attr('cy', function (point) {
									return scope.yScale(point[scope.y.key]);
								});
					});
			}

			// Update tooltip
			if (scope.tPoints && scope.mousePos) {
				scope.mousemove(scope.mousePos, true);
			}

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

			if (scope.isLineChart() || scope.isAreaChart()) {
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
			}

			if (scope.isAreaChart()) {
				scope.areaPaths = scope.clip
					.selectAll('.area')
					.data(scope.data, function (chart) {
						return chart.id;
					});

				scope.areaPaths
					.enter()
					.append('path')
					.classed('area', true)
					.attr('id', function (chart) {
						return chart.id;
					})
					.style('fill', function (chart) {
						return chart.color || scope.colors(chart.id);
					});
			}

			if (scope.isScatterPlot()) {
				scope.scatterGroups = scope.clip
					.selectAll('.scatter')
					.data(scope.data, function (chart) {
						return chart.id;
					});

				scope.scatterGroups
					.enter()
					.append('g')
					.classed('scatter', true);
			}

			// Update legend
			scope.updateLegend();

			// Update tooltip
			if (scope.tPoints && scope.mousePos) {
				scope.mousemove(scope.mousePos, true);
			}

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

			if (scope.isLineChart() || scope.isAreaChart()) {
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

				// exit
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
			}

			if (scope.isAreaChart()) {
				scope.areaPaths = scope.clip
					.selectAll('.area')
					.data(scope.data, function (chart) {
						return chart.id;
					});

				// update
				scope.areaPaths
					.transition()
					.duration(scope.duration)
						.attr('d', function (chart) {
							return scope.area(chart.data);
						});

				// exit
				scope.areaPaths
					.exit()
					.transition()
					.duration(scope.duration)
						.style('fill-opacity', 0)
						.attr('d', function (chart) {
							var data = chart.data.map(function (point) {
								var obj = {};
								obj[scope.x.key] = point[scope.x.key];
								obj[scope.y.key] = 0;

								return obj;
							});

							return scope.area(data);
						})
						.remove();
			}

			if (scope.isScatterPlot()) {
				scope.scatterGroups = scope.clip
					.selectAll('.scatter')
					.data(scope.data, function (chart) {
						return chart.id;
					});

				// update
				scope.scatterGroups
					.each(function (chart) {
						d3.select(this)
							.selectAll('.s-circle')
							.transition()
							.duration(scope.duration)
								.attr('cx', function (point) {
									return scope.xScale(point[scope.x.key]);
								})
								.attr('cy', function (point) {
									return scope.yScale(point[scope.y.key]);
								});
					});

				// exit
				scope.scatterGroups
					.exit()
					.each(function (chart) {
						d3.select(this)
							.selectAll('.s-circle')
							.transition()
							.duration(scope.duration)
								.attr('cy', function (point) {
									return scope.yScale(0);
								})
								.style('opacity', 0)
								.remove();
					});

				scope.scatterGroups
					.exit()
					.transition()
					.delay(scope.duration)
						.remove();
			}

			// Update legend
			scope.updateLegend();

			// Update tooltip
			if (scope.tPoints && scope.mousePos) {
				scope.mousemove(scope.mousePos, true);
			}
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

					if (scope.isLineChart() || scope.isAreaChart()) {
						scope.paths
							.attr('d', function (chart) {
								return scope.line(chart.data);
							});
					}

					if (scope.isAreaChart()) {
						scope.areaPaths
							.attr('d', function (chart) {
								return scope.area(chart.data);
							});
					}

					if (scope.isScatterPlot()) {
						scope.scatterGroups.each(function (chart) {
							d3.select(this)
								.selectAll('.s-circle')
								.attr('cx', function (point) {
									return scope.xScale(point[scope.x.key]);
								})
								.attr('cy', function (point) {
									return scope.yScale(point[scope.y.key]);
								});
						});
					}
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
				.on('mousemove', function () {
					scope.mousemove(d3.mouse(this));
				})
				.on('mouseout', function () {
					scope.mouseout();
				});
		},

		/*
		 * TODO comment
		 */
		mousemove: function (mouse, animate) {
			var scope = this;
			var x = scope.xScale.invert(mouse[0]);

			// save current mouse position
			scope.mousePos = mouse;

			// Init tooltip points array
			scope.tPoints = [];

			// Find points corresponding to
			// current mouse position
			_.each(scope.data, function (chart) {
				var i,
					p1,
					p2,
					p;

				i = scope.bisector(chart.data, x, 1);

				p1 = chart.data[i - 1];
				p2 = chart.data[i];

				if (p2) {
					p = x - p1[scope.x.key] > p2[scope.x.key] - x ? p2 : p1;
				} else {
					p = p1;
				}

				scope.tPoints.push({
					point: p,
					color: chart.color || scope.colors(chart.id)
				});
			});

			// render points
			var circles = scope.clip
				.selectAll('.t-circle')
				.data(scope.tPoints, function (d) {
					return d.color;
				});

			// enter
			circles
				.enter()
				.append('circle')
				.classed('t-circle', true)
				.attr('r', 4)
				.attr('cx', function (d) {
					return scope.xScale(d.point[scope.x.key]);
				})
				.attr('cy', function (d) {
					return scope.yScale(d.point[scope.y.key]);
				})
				.style('fill', function (d) {
					return d.color;
				})
				.style('stroke', 'white');

			// update
			circles
				.transition()
				.duration(animate ? scope.duration : 0)
					.attr('cx', function (d) {
						return scope.xScale(d.point[scope.x.key]);
					})
					.attr('cy', function (d) {
						return scope.yScale(d.point[scope.y.key]);
					});

			// exit
			circles
				.exit()
				.remove();

			// render values
			var tValues = scope.tValuesGroup
				.selectAll('.t-item')
				.data(scope.tPoints, function (d) {
					return d.color;
				});

			// enter
			tValues
				.enter()
				.append('g')
				.classed('t-item', true)
				.each(function (d, i) {
					var group,
						siblings,
						offset;

					siblings = this.parentNode.childNodes;
					offset = 0;

					for (var j = 0; j < i; j++) {
						offset += siblings[j].getBBox().width + 5;
					}

					group = d3.select(this)
						.style('opacity', 0);

					group.append('rect')
						.attr('width', 10)
						.attr('height', 10)
						.attr('rx', 2)
						.style('fill', d.color);

					group.append('text')
						.attr('x', 12)
						.attr('dy', '.8em')
						.text(d3.round(d.point[scope.y.key], 2));

					group
						.transition()
						.duration(100)
							.style('opacity', 1)
							.attr('transform',
								'translate(' + [offset, 0] + ')');
				});

			// update
			tValues.each(function (d, i) {
				var group,
					siblings,
					offset;

				siblings = this.parentNode.childNodes;
				offset = 0;

				for (var j = 0; j < i; j++) {
					offset += siblings[j].getBBox().width + 10;
				}

				group = d3.select(this);

				group
					.select('text')
					.text(d3.round(d.point[scope.y.key], 2));

				group
					.transition()
					.duration(100)
						.style('opacity', 1)
						.attr('transform',
							'translate(' + [offset, 0] + ')');
			});

			// exit
			tValues
				.exit()
				.remove();
		},

		mouseout: function () {
			var scope = this;

			// clear out mouse pos
			scope.mousePos = null;

			// clear out tooltip points
			scope.tPoints = [];

			scope.clip
				.selectAll('.t-circle')
				.remove();

			scope.tValuesGroup
				.selectAll('.t-item')
				.remove();
		}
	});

	/*
	 * Area chart constructor
	 */
	var Area = function (options) {
		Line.apply(this, arguments);
		this.chartType = 'area';
	};

	_.extend(Area.prototype, Line.prototype);

	/*
	 * Scatter plot chart constructor
	 */
	var Scatter = function (options) {
		Line.apply(this, arguments);
		this.chartType = 'scatter';
	};

	_.extend(Scatter.prototype, Line.prototype);

	var Bar = function (options) {
		AxisChart.apply(this, arguments);
		this.chartType = 'bar';
	};

	_.extend(Bar.prototype, AxisChart.prototype, {
		/*
		 * TODO comment
		 */
		render: function () {
			var scope = this;

			AxisChart.prototype.render.apply(scope, arguments);

			scope.barGroups = scope.clip
				.selectAll('.bars')
				.data(scope.data, function (chart) {
					return chart.id;
				})
				.enter()
				.append('g')
				.classed('bars', true);

			scope.barGroups.each(function (chart, i) {
				d3.select(this)
					.selectAll('.bar')
					.data(chart.data)
					.enter()
					.append('rect')
						.classed('bar', true)
						.attr('x', function (p) {
							return scope.xScale(p[scope.x.key]) +
								scope.xScale.rangeBand() / scope.data.length * i;
						})
						.attr('y', scope.height)
						.attr('height', 0)
						.attr('width', scope.xScale.rangeBand() / scope.data.length)
						.attr('rx', 1)
						.style('fill', chart.color || scope.colors(chart.id))
						.style('fill-opacity', 0)
							.transition()
							.duration(scope.duration)
								.attr('y', function (p) {
									return scope.yScale(p[scope.y.key]);
								})
								.attr('height', function (p) {
									return scope.height - scope.yScale(p[scope.y.key]);
								})
								.style('fill-opacity', 1);
			});

			// init mouse events
			// scope.mouse();

			// subscribe to resize
			// scope.resize();

			return scope;
		},

		/*
		 * TODO comment
		 */
		update: function (newData) {
			var scope = this;
			
			var dataCopy;

			// If no data do nothing
			if (!newData ||
				(_.isArray(newData) && !newData.length)) {
				return;
			}

			if (!newData.length) {
				newData = [newData];
			}

			dataCopy = scope.formatData(newData);

			scope.barGroups
				.data(dataCopy, function (chart) {
					return chart.id;
				})
				.each(function (chart, i) {
					var rect = d3.select(this)
						.selectAll('.bar')
						.data(chart.data);
				});

			// Update scales/axes
			AxisChart.prototype.update.apply(scope, arguments);

			// Update bars according to new
			// scales and axes
			scope.barGroups
				.data(dataCopy, function (chart) {
					return chart.id;
				})
				.each(function (chart, i) {
					var rect = d3.select(this)
						.selectAll('.bar')
						.data(chart.data);

					// update
					rect
						.transition()
						.duration(scope.duration)
							.attr('x', function (p) {
								return scope.xScale(p[scope.x.key]) +
									scope.xScale.rangeBand() /
									scope.data.length * i;
							})
							.attr('y', function (p) {
								return scope.yScale(p[scope.y.key]);
							})
							.attr('height', function (p) {
								return scope.height -
									scope.yScale(p[scope.y.key]);
							})
							.attr('width',
								scope.xScale.rangeBand() /
								scope.data.length);

					// enter
					rect
						.enter()
						.append('rect')
							.classed('bar', true)
							.attr('x', function (p) {
								return scope.xScale(p[scope.x.key]) +
									scope.xScale.rangeBand() / scope.data.length * i;
							})
							.attr('y', scope.height)
							.attr('height', scope.yScale(0))
							.attr('width', scope.xScale.rangeBand() / scope.data.length)
							.attr('rx', 1)
							.style('fill', chart.color || scope.colors(chart.id))
							.style('fill-opacity', 0)
								.transition()
								.duration(scope.duration)
									.attr('y', function (p) {
										return scope.yScale(p[scope.y.key]);
									})
									.attr('height', function (p) {
										return scope.height - scope.yScale(p[scope.y.key]);
									})
									.style('fill-opacity', 1);

					// exit
					rect
						.exit()
						.remove();
				});
		},

		/*
		 * TODO comment
		 */
		add: function () {
			
		},

		/*
		 * TODO comment
		 */
		remove: function () {
			
		},

		/*
		 * TODO comment
		 */
		destroy: function () {
			
		}
	});

	Chart.Line = Line;
	Chart.Area = Area;
	Chart.Scatter = Scatter;
	Chart.Bar = Bar;
})(Chart);