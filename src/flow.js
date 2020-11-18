import $ from 'jquery';

let flow = {
    /**
     * 流程图初始化方法
     * @param selector
     * @param data
     * @returns {flow}
     */
    init (selector, data, option) {
        this.$selector = $(selector);
        this.config = $.extend({
            closedItems: [],
            color: {
                title: [],
                content: []
            },
            defaultColor: '#ccc',
            row: data.length
        }, option, true);
        this.panels = [];
        this.interval = {horizontal: 15, vertical: 15};
        this.self = {selector: selector, data: data};
        let _width = this.config.width || this.$selector.width();
        this.$canvas = $('<canvas width="' + (_width < 1000 ? 1000 : _width) + '" height="' + (this.config.height || this.$selector.height()) + '"></canvas>');
        this.$selector.append(this.$canvas);
        this.line = {normal: [], horizontal: [], vertical: [], hide: {horizontal: [], vertical: []}};
        this.setCanvasPosition();
        this.drawBackground();
        this.setPanelTitle(data);
        return this;
    },
    /**
     * 跟随window窗口自动调整canvas宽度
     * @param callback
     */
    resize(callback) {
        $(window).resize(e => {
            this.$selector.children().remove();
            this.init(this.self.selector, this.self.data, this.config);
            this.draw(this.lineArray);
            this.refreshCanvas();
        });
    },
    /**
     * 绘图行背景
     * @param num
     */
    drawBackground (isInit = true) {
        let _height = this.position.height / this.config.row;
        let ctx = this.$canvas.get(0).getContext('2d');
        ctx.clearRect(0, 0, this.position.width, this.position.height);
        for (let i = 0; i < this.config.row; i++) {
            let top = _height * i;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, top);
            ctx.lineTo(0 + this.position.width + 1, top);
            ctx.lineTo(0 + this.position.width + 1, top + _height);
            ctx.lineTo(0, top + _height);
            ctx.closePath();
            ctx.fillStyle = (i % 2) ? 'rgb(245, 245, 245)' : 'transparent';
            ctx.fill();
            ctx.restore();
            isInit && this.panels.push({left: 0, top: top, height: _height, width: this.position.width});
        }
    },
    /**
     * 设置canvas坐标信息
     */
    setCanvasPosition() {
        this.position = $.extend({
            width: this.$canvas.width(),
            height: this.$canvas.height()
        }, this.$canvas.offset(), true);
    },
    /**
     * 设置行左边标题
     * @param data
     */
    setPanelTitle(data) {
        this.panels.forEach((obj, index) => {
            let $div = $('<div class="panel-title"></div>')
                .css({
                    top: obj.top,
                    width: 100,
                    height: obj.height,
                    background: this.config.color.title[index] || this.config.defaultColor
                })
                .html(data[index].name)
                .appendTo(this.$selector);

            this.panels[index].title = {
                $element: $div,
                position: {
                    width: 100,
                    height: obj.height,
                    left: 0,
                    top: obj.top
                },
                color: this.config.color.title[index] || this.config.defaultColor
            };
            this.setPanelContent(index, data[index].data);
        });
    },
    /**
     * 设置行内容元素
     * @param index
     * @param data
     */
    setPanelContent(index, data) {
        let _width = (this.position.width - 100) / data.length,
            _divWidth = _width * 0.7,
            _divLeft = 50;

        let _divHeight = this.panels[index].height * 0.55,
            _divTop = this.panels[index].height * 0.45 / 2;

        this.panels[index].content = [];
        data.forEach((obj, i) => {
            let $div = $('<div class="panel-item"></div>')
                .attr('data-horizontal-index', index)
                .attr('data-vertical-index', i)
                .css({
                    left: _width * i + _divLeft + 100,
                    top: this.panels[index].top + _divTop,
                    width: _divWidth,
                    height: _divHeight,
                    background: this.config.color.content[index] || this.config.defaultColor,
                    display: this.isInClosedItems(index, i) ? 'none' : 'block'
                })
                .appendTo(this.$selector);
            this.panels[index].content.push({
                $element: $div,
                position: {
                    width: _divWidth,
                    height: _divHeight,
                    left: _width * i + _divLeft + 100,
                    top: this.panels[index].top + _divTop,
                },
                color: this.config.color.content[index] || this.config.defaultColor,
                point: {
                    top: [], bottom: [], left: [], right: [],
                    number: {top: 0, bottom: 0, left: 0, right: 0}
                },
                line: [],
                main: obj.isMain
            });
            // 是否为主要流程元素：可控制相关非主流程元素隐藏或显示[当该参数存在时closable将失效]
            if (obj.isMain) {
                $div.click(e => {
                    let index = [Number($(e.currentTarget).attr('data-horizontal-index')), Number($(e.currentTarget).attr('data-vertical-index'))];
                    let item = this.panels[index[0]].content[index[1]];
                    let relevance = {show: [], hide: []};
                    for (let key in item.point) {
                        if (key === 'number')
                            continue;
                        item.point[key].forEach(point => {
                            if (this.panels[point.relevance[0]].content[point.relevance[1]].main)
                                return;
                            relevance[this.isInClosedItems(...point.relevance) ? 'hide' : 'show'].push(point.relevance);
                        });
                    }
                    if (relevance.show.length) {
                        relevance.show.forEach(_item => {
                            this.panels[_item[0]].content[_item[1]].$element.hide();
                        });
                        this.config.closedItems.push(...relevance.show);
                    } else {
                        relevance.hide.forEach(_item => {
                            this.panels[_item[0]].content[_item[1]].$element.show();
                        });
                        this.config.closedItems = this.config.closedItems.filter(_item => {
                            return !relevance.hide.find(obj => obj[0] === _item[0] && obj[1] === _item[1]);
                        });
                    }
                    this.refreshCanvas();
                });
            }
            //设置是否可关闭
            else if (obj.closable) {
                $('<div class="close"></div>')
                    .appendTo($div)
                    .click(e => {
                        let $parent = $(e.currentTarget).parent();
                        $parent.hide();
                        this.config.closedItems.push([Number($parent.attr('data-horizontal-index')), Number($parent.attr('data-vertical-index'))]);
                        this.refreshCanvas();
                    });
            }
            //设置提示消息框
            if (obj.hint) {
                $div.hover(e => {
                    let $this = $(e.currentTarget),
                        offset = $this.offset();
                    $('<div class="item-hint"></div>')
                        .css({
                            left: offset.left,
                            top: offset.top + $this.height() + 5,
                            background: this.config.color.title[index] || this.config.defaultColor
                        })
                        .html(obj.hint)
                        .appendTo(document.body);
                }, e => {
                    $('.item-hint').remove();
                });
            }
            //设置主体内容
            $('<div class="item-main"></div>').html(obj.content).appendTo($div);
            //设置底部样式和内容
            let $footer = $('<div class="item-footer"></div>').css({
                background: this.panels[index].title.color
            }).html(obj.footer).appendTo($div);
            //设置底部是否有详情链接
            if (obj.hasDetail) {
                $('<a>details</a>').attr('href', '').appendTo($footer);
            }
        });
    },
    /**
     *  初始化panels
     */
    initPanelData() {
        this.panels.forEach((panel, i) => {
            panel.content.forEach((obj, j) => {
                this.panels[i].content[j].point = $.extend(this.panels[i].content[j].point, {
                    top: [], bottom: [], left: [], right: [],
                }, true);
                this.panels[i].content[j].line = [];
            });
        });
        this.line = $.extend(this.line, {normal: [], horizontal: [], vertical: []}, true);
    },
    /**
     * 比较并生成不重叠的水平（垂直）直线
     * @param point1
     * @param point2
     * @param key
     * @param isAdd
     * @returns {*}
     */
    getSeparateLine(point1, point2, isAdd = true) {
        if (point1.x === point2.x) {
            let interval = isAdd ? this.interval.vertical : -this.interval.vertical;
            for (let i in this.line.vertical) {
                let max = Math.max(this.line.vertical[i].start.y, this.line.vertical[i].end.y) + 5,
                    min = Math.min(this.line.vertical[i].start.y, this.line.vertical[i].end.y) - 5;
                if (point1.x < (this.line.vertical[i].start.x - 2) || point1.x > (this.line.vertical[i].start.x + 2)
                    || (point1.y < min && point2.y < min || point1.y > max && point2.y > max))
                    continue;
                return this.getSeparateLine({x: point1.x + interval, y: point1.y}, {
                    x: point2.x + interval,
                    y: point2.y
                }, isAdd);
            }
            return [point1, point2];
        }
        let interval = isAdd ? this.interval.horizontal : -this.interval.horizontal;
        for (let i in this.line.horizontal) {
            let max = Math.max(this.line.horizontal[i].start.x, this.line.horizontal[i].end.x) + 5,
                min = Math.min(this.line.horizontal[i].start.x, this.line.horizontal[i].end.x) - 5;
            if (point1.y < (this.line.horizontal[i].start.y - 2) || point1.y > (this.line.horizontal[i].start.y + 2)
                || (point1.x < min && point2.x < min || point1.x > max && point2.x > max))
                continue;
            return this.getSeparateLine({x: point1.x, y: point1.y + interval}, {
                x: point2.x,
                y: point2.y + interval
            }, isAdd);
        }
        return [point1, point2];
    },
    /**
     * 存储水平（垂直）直线坐标信息
     * @param start
     * @param end
     * @returns {number}
     */
    pushLineByDirection (start, end) {
        let key = start.x === end.x ? 'vertical' : 'horizontal';
        this.line[key].push({start: start, end: end});
        return this.line[key].length - 1;
    },
    /**
     * 存储所有点连线
     * @param points
     */
    pushLinesByPoints (points) {
        let prePoint = null;
        points.forEach((point, index) => {
            prePoint = point;
            if (!index)
                return;
            this.pushLineByDirection(points[index - 1], point)
        });
    },
    /**
     * 获取一行的div之间的间隙信息
     * @param content
     * @returns {Array}
     */
    getPanelVerticalInterval (content) {
        let array = [];
        content.forEach((item, index) => {
            if (!index)
                return;
            let x1 = content[index - 1].position.left + content[index - 1].position.width;
            let data = {
                x1: x1,
                x2: item.position.left,
                center: (x1 + item.position.left) / 2,
                y: item.position.top,
                width: item.position.left - x1,
                height: item.position.height
            };
            if (this.getNormalVerticalLine(data) > 0) {
                array.push(data);
            }
            if (index < content.length - 1)
                return;
            let last = {
                x1: data.x2 + item.position.width + this.interval.vertical,
                x2: this.$canvas.width(),
                center: data.x2 + item.position.width + this.interval.vertical,
                y: data.y,
                width: data.x2 + this.interval.vertical,
                height: data.height,
                isLast: true
            };
            if (this.getNormalVerticalLine(last) > 0) {
                array.push(last);
            }
        });

        return array;
    },
    /**
     * 根据一行中div间隙获取非重叠的x轴坐标
     * @param data
     */
    getNormalVerticalLine(data) {
        let right = this.getSeparateLine({
                x: data.isLast ? data.x1 : data.center,
                y: data.y
            }, {x: data.isLast ? data.x1 : data.center, y: data.y + data.height}),
            left = data.isLast ? null : this.getSeparateLine({
                x: data.center,
                y: data.y
            }, {x: data.center, y: data.y + data.height}, false);
        if ((right[0].x > data.x1 || data.isLast && right[0].x === data.x1) && right[0].x < data.x2) {
            return right[0].x;
        }
        if (!data.isLast && left[0].x > data.x1 && left[0].x < data.x2) {
            return left[0].x;
        }
        return -1;
    },
    /**
     * 获取下一行左右方向最近的间隙信息
     * @param point
     * @param data
     * @returns {{left: null, right: null}}
     */
    getNearestVerticalInterval(point, data) {
        let nearest = {left: null, right: null};
        data.forEach(obj => {
            if (obj.isLast && !nearest.right) {
                nearest.right = obj;
                return;
            }
            let center = (obj.x1 + obj.x2) / 2;
            if (point.x > center && (!nearest.left || obj.x1 > nearest.left.x1)) {
                nearest.left = obj;
            } else if (!nearest.right || obj.x1 < nearest.right.x1) {
                nearest.right = obj;
            }
        });
        return nearest;
    },
    /**
     * 根据相连关系的数组绘图
     * @param array
     * @returns {boolean}
     */
    draw(array) {
        if (!Array.isArray(array))
            return false;
        this.lineArray = array;
        this.lineData = array.concat().map(obj => {
            let arr = [];
            if (obj.start[0] < obj.end[0] || obj.start[0] === obj.end[0] && obj.start[1] < obj.end[1]) {
                arr.push(obj.start, obj.end, obj.both ? 0 : 1, obj.text)
            } else {
                arr.push(obj.end, obj.start, obj.both ? 0 : -1, obj.text);
            }
            return arr
        }).sort((a, b) => {
            if (a[0][0] !== b[0][0]) {
                return a[0][0] - b[0][0];
            }
            if (a[0][1] !== b[0][1]) {
                return a[0][1] - b[0][1];
            }
            if (a[1][0] !== b[1][0]) {
                return a[1][0] - b[1][0];
            }
            return a[1][1] - b[1][1];
        }).map(obj => {
            if (obj[0][0] !== obj[1][0]) {
                this.panels[obj[0][0]].content[obj[0][1]].point.number.bottom += 1;
                this.panels[obj[1][0]].content[obj[1][1]].point.number.top += 1;
            } else {
                this.panels[obj[0][0]].content[obj[0][1]].point.number.left += 1;
                this.panels[obj[1][0]].content[obj[1][1]].point.number.right += 1;
            }
            return obj;
        });

        this.lineData.forEach(obj => {
            this.drawLine(...obj);
        });
        return true;
    },
    /**
     * 根据开始-结束点画线
     * @param start
     * @param end
     * @param inverted {-1:反方向，0:双向，1:正常方向[默认]}
     * @param text
     */
    drawLine(start, end, inverted = 1, text){
        let startDiv = this.panels[start[0]].content[start[1]],
            endDiv = this.panels[end[0]].content[end[1]];
        if (start[0] !== end[0]) {
            //跨行元素连线
            let startPoint = {
                x: startDiv.position.left + startDiv.position.width / 2 - this.interval.vertical * (startDiv.point.number.bottom - 1) / 2,
                y: startDiv.position.top + startDiv.position.height
            };
            let endPoint = {
                x: endDiv.position.left + endDiv.position.width / 2 - this.interval.vertical * (endDiv.point.number.top - 1) / 2,
                y: endDiv.position.top
            };
            let interval = startPoint.x <= endPoint.x ? this.interval.vertical : -this.interval.vertical;
            if (Math.abs(end[0] - start[0]) > 1) {
                let panelInterval = this.getPanelVerticalInterval(this.panels[start[0] + 1].content);
                let nearest = this.getNearestVerticalInterval(startPoint, panelInterval);
                let left = !nearest.left ? -1 : Math.abs(startPoint.x - nearest.left.center) + Math.abs(endPoint.x - nearest.left.center),
                    right = !nearest.right ? -1 : Math.abs(startPoint.x - nearest.right.center) + Math.abs(endPoint.x - nearest.right.center);
                interval = (left > 0 && (left < right || right < 0)) ? -this.interval.vertical : this.interval.vertical;
            }
            startDiv.point.bottom.forEach(obj => {
                if (startPoint.x === obj.x)
                    startPoint.x = startPoint.x + Math.abs(interval);
            });
            endDiv.point.top.forEach(obj => {
                if (endPoint.x === obj.x)
                    endPoint.x = endPoint.x + Math.abs(interval);
            });
            startDiv.point.bottom.push($.extend({relevance: end}, startPoint));
            endDiv.point.top.push($.extend({relevance: start}, endPoint));
            let points = [startPoint];
            if (Math.abs(end[0] - start[0]) > 1) {
                let temp = null;
                for (let i = 1; i < Math.abs(end[0] - start[0]); i++) {
                    let _startPoint = i === 1 ? startPoint : {
                        x: points[points.length - 1].x,
                        y: temp.content[0].position.top + temp.content[0].position.height
                    };
                    temp = this.panels[start[0] + i];

                    let panelInterval = this.getPanelVerticalInterval(temp.content);
                    let nearest = this.getNearestVerticalInterval(_startPoint, panelInterval);
                    nearest = (interval < 0 && nearest.left || nearest.left && !nearest.right) ? nearest.left : nearest.right;
                    let _nextX = this.getNormalVerticalLine(nearest);

                    let _y = _startPoint.y + Math.abs(_startPoint.y - temp.content[0].position.top) / (_startPoint.x > _nextX ? 4 : 4 / 3);
                    points.push(...this.getSeparateLine({x: _startPoint.x, y: _y}, {
                        x: _nextX,
                        y: _y
                    }, _startPoint.x > _nextX));
                }

                let _y = temp.content[0].position.top + temp.content[0].position.height
                    + Math.abs(temp.content[0].position.top + temp.content[0].position.height - endPoint.y) / (points[points.length - 1].x > endPoint.x ? 4 : 4 / 3);
                points.push(...this.getSeparateLine({x: points[points.length - 1].x, y: _y}, {
                    x: endPoint.x,
                    y: _y
                }, points[points.length - 1].x > endPoint.x));

            } else if (startPoint.x !== endPoint.x) {
                let _y = startPoint.y + Math.abs(startPoint.y - endPoint.y) / (interval < 0 ? 4 : 4 / 3);
                points.push(...this.getSeparateLine({x: startPoint.x, y: _y}, {
                    x: endPoint.x,
                    y: _y
                }, interval < 0));
            }
            points.push(endPoint);
            startDiv.line.push({start: start, end: end, inverted: inverted, points: points});
            endDiv.line.push({start: start, end: end, inverted: inverted, points: points});
            this.line.normal.push({
                start: start,
                end: end,
                points: points,
                direction: ['up', 'up-down', 'down'][inverted + 1],
                color: inverted < 0 ? endDiv.color : startDiv.color,
                text: text
            });
            this.pushLinesByPoints(points);
            if (!this.isInClosedItems(...start) && !this.isInClosedItems(...end))
                this.drawLineByPoint(points, ['up', 'up-down', 'down'][inverted + 1], inverted < 0 ? endDiv.color : startDiv.color, text);
        } else {
            //同一行内元素连线
            let startPoint = {
                x: startDiv.position.left + startDiv.position.width,
                y: startDiv.position.top + startDiv.position.height / 2
            };
            let endPoint = {
                x: endDiv.position.left,
                y: endDiv.position.top + startDiv.position.height / 2
            };
            startDiv.point.right.forEach(obj => {
                if (startPoint.y === obj.y)
                    startPoint.y = startPoint.y + this.interval.horizontal;
            });
            endDiv.point.left.forEach(obj => {
                if (endPoint.y === obj.y)
                    endPoint.y = endPoint.y + this.interval.horizontal;
            });
            startDiv.point.right.push($.extend({relevance: end}, startPoint));
            endDiv.point.left.push($.extend({relevance: start}, endPoint));
            let points = [startPoint];
            if (Math.abs(end[1] - start[1]) > 1) {
                let _y = startDiv.position.top + startDiv.position.height + this.interval.horizontal;
                let panelInterval = this.getPanelVerticalInterval(this.panels[start[0]].content);
                points.push({x: this.getNormalVerticalLine(panelInterval[start[1]]), y: startPoint.y});
                let _endPoint = {x: this.getNormalVerticalLine(panelInterval[end[1] - 1]), y: endPoint.y};
                points.push(...this.getSeparateLine({x: points[points.length - 1].x, y: _y}, {
                    x: _endPoint.x,
                    y: _y
                }));
                points.push(_endPoint);
            }
            points.push(endPoint);
            startDiv.line.push({start: start, end: end, inverted: inverted, points: points});
            endDiv.line.push({start: start, end: end, inverted: inverted, points: points});
            this.line.normal.push({
                start: start,
                end: end,
                points: points,
                direction: ['left', 'left-right', 'right'][inverted + 1],
                color: startDiv.color,
                text: text
            });

            this.pushLinesByPoints(points);
            if (!this.isInClosedItems(...start) && !this.isInClosedItems(...end))
                this.drawLineByPoint(points, ['left', 'left-right', 'right'][inverted + 1], startDiv.color, text);
        }
        return true;
    },
    /**
     * 绘制连线
     * @param points
     * @param direction [箭头方向：up, down, left, right, up-down(上下双向), left-right(左右双向)]
     * @param color
     * @param text
     */
    drawLineByPoint(points, direction, color, text){
        let ctx = this.$canvas.get(0).getContext('2d'),
            _points = points.concat();
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.lineJoin = 'bevel';
        ctx.strokeStyle = color || 'black';
        switch (direction) {
            case 'down':
                _points.forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x, point.y + 1);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x, y: point.y - 10});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
            case 'up':
                _points.reverse().forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x, point.y - 1);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x, y: point.y + 10});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
            case 'up-down':
                _points.forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x, point.y + 10);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x, y: point.y - 10});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
            case 'left':
                _points.reverse().forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x - 1, point.y);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x + 10, y: point.y});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
            case 'right':
                _points.forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x + 1, point.y);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x - 10, y: point.y});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
            case 'left-right':
                _points.forEach((point, index) => {
                    if (!index) {
                        ctx.moveTo(point.x + 10, point.y);
                        return;
                    }
                    if (index >= _points.length - 1) {
                        this.drawIntersectLine(ctx, _points[index - 1], {x: point.x - 10, y: point.y});
                    } else {
                        this.drawIntersectLine(ctx, _points[index - 1], point);
                    }
                });
                break;
        }
        ctx.stroke();
        ctx.restore();
        if(['up-down','left-right'].indexOf(direction) >= 0) {
            let _direction = direction.split('-');
            this.drawArrows({x: _points[0].x, y: _points[0].y}, _direction[0], color);
            this.drawArrows({x: _points[_points.length - 1].x, y: _points[_points.length - 1].y}, _direction[1], color);
        } else {
            this.drawArrows({x: _points[_points.length - 1].x, y: _points[_points.length - 1].y}, direction, color);
        }
        text && this.drawTextOnLine(_points, text, {color: color});
    },
    /**
     * 绘画线末端箭头
     * @param point
     * @param direction
     * @param color
     */
    drawArrows(point, direction, color) {
        let ctx = this.$canvas.get(0).getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        switch (direction) {
            case 'down':
                ctx.moveTo(point.x, point.y - 11);
                ctx.lineTo(point.x - 8, point.y - 11);
                ctx.lineTo(point.x, point.y - 2);
                ctx.lineTo(point.x + 8, point.y - 11);
                break;
            case 'up':
                ctx.moveTo(point.x, point.y + 11);
                ctx.lineTo(point.x - 8, point.y + 11);
                ctx.lineTo(point.x, point.y + 2);
                ctx.lineTo(point.x + 8, point.y + 11);
                break;
            case 'left':
                ctx.moveTo(point.x + 11, point.y);
                ctx.lineTo(point.x + 11, point.y - 8);
                ctx.lineTo(point.x + 2, point.y);
                ctx.lineTo(point.x + 11, point.y + 8);
                break;
            case 'right':
                ctx.moveTo(point.x - 11, point.y);
                ctx.lineTo(point.x - 11, point.y - 8);
                ctx.lineTo(point.x - 2, point.y);
                ctx.lineTo(point.x - 11, point.y + 8);
                break;
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },
    /**
     * 在线上填充文字[以较长的横线优先]
     * @param points
     * @param text
     * @param option {color,font,size}
     */
    drawTextOnLine(points, text, option) {
        if (!Array.isArray(points) || points.length < 2)
            return;
        option = $.extend({size: 12, font: 'sans-serif', color: 'black'}, option, true);

        let ctx = this.$canvas.get(0).getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.font = option.size + 'px ' + option.font;

        let width = ctx.measureText(text).width;
        let distance = Math.abs(points[0].x - points[1].x);
        let output = {
            isHorizontal: points[0].y === points[0].y,
            distance: distance
        };
        output.x = output.isHorizontal ?
            (Math.min(points[0].x, points[1].x) + (distance > width ? Math.abs(distance - width) : -Math.abs(distance - width)) / 2) : (points[0].x - width / 2);
        output.y = output.isHorizontal ? points[0].y : ((points[0].y + points[1].y) / 2);
        if (points.length > 2) {
            points.forEach((obj, i) => {
                if (i < 2) return;
                if (points[i - 1].y !== points[i].y) return;
                let _width = Math.abs(points[i].x - points[i - 1].x);
                if (output.isHorizontal && _width < output.distance) return;
                output = {
                    isHorizontal: true,
                    x: Math.min(points[i - 1].x, points[i].x) + (_width > width ? Math.abs(_width - width) : -Math.abs(_width - width)) / 2,
                    y: obj.y,
                    distance: _width
                };
            });
        }
        ctx.clearRect(output.x - 2, output.y - option.size / 2, width + 4, option.size);
        ctx.fillStyle = option.color;
        ctx.fillText(text, output.x, output.y + option.size / 4);
        ctx.stroke();
        ctx.restore();
    },
    /**
     * 根据下标位置判断是否被关闭元素
     * @param hIndex
     * @param vIndex
     */
    isInClosedItems(hIndex, vIndex) {
        return !!this.config.closedItems.find(item => item[0] == hIndex && item[1] == vIndex);
    },
    /**
     * 重新渲染canvas线路
     */
    refreshCanvas() {
        this.drawBackground(false);
        this.initHideLine();
        this.initPanelData();
        this.lineData.forEach(obj => {
            this.drawLine(...obj);
        });
    },
    /**
     * 判断是否同一个点坐标
     * @param point1
     * @param point2
     * @returns {boolean}
     */
    isSamePoint(point1, point2) {
        return point1.x === point2.x && point1.y === point2.y;
    },
    /**
     * 判断是否同一条直线
     * @param line1
     * @param line2
     * @returns {*|boolean}
     */
    isSameLine(line1, line2) {
        return this.isSamePoint(line1.start, line2.start) && this.isSamePoint(line1.end, line2.end);
    },
    /**
     * 获取与其他直线相交的点
     * @param start
     * @param end
     * @returns {Array}
     */
    getIntersectPoint(start, end) {
        let points = [];
        if (start.x === end.x) {
            this.line.horizontal.forEach(obj => {
                if (obj.start.y < Math.max(start.y, end.y) && obj.start.y > Math.min(start.y, end.y)
                    && start.x < Math.max(obj.start.x, obj.end.x) && start.x > Math.min(obj.start.x, obj.end.x)
                    && !this.line.hide.horizontal.find(item => this.isSameLine(item, {
                        start: obj.start,
                        end: obj.end
                    }))) {
                    points.push({x: start.x, y: obj.start.y});
                }
            });
        } else {
            this.line.vertical.forEach(obj => {
                if (obj.start.x < Math.max(start.x, end.x) && obj.start.x > Math.min(start.x, end.x)
                    && start.y < Math.max(obj.start.y, obj.end.y) && start.y > Math.min(obj.start.y, obj.end.y)
                    && !this.line.hide.vertical.find(item => this.isSameLine(item, {start: obj.start, end: obj.end}))) {
                    points.push({x: obj.start.x, y: start.y});
                }
            });
        }
        return points;
    },
    /**
     * 绘画与其他线相交位置带半圆的直线
     * @param ctx
     * @param start
     * @param end
     */
    drawIntersectLine(ctx, start, end) {
        let intersect = this.getIntersectPoint(start, end);
        if (start.x === end.x) {
            let radius = start.y < end.y ? 4 : -4;
            intersect.sort((a, b) => start.y < end.y ? (a.y - b.y) : (b.y - a.y));
            intersect.forEach(point => {
                ctx.lineTo(point.x, point.y - radius);
                ctx.arcTo(point.x - Math.abs(radius * 4), point.y, point.x + 1, point.y + radius, Math.abs(radius));
            });
        } else {
            let radius = start.x < end.x ? 4 : -4;
            intersect.sort((a, b) => start.x < end.x ? (a.x - b.x) : (b.x - a.x));
            intersect.forEach(point => {
                ctx.lineTo(point.x - radius, point.y);
                ctx.arcTo(point.x, point.y - Math.abs(radius * 4), point.x + radius, point.y + 1, Math.abs(radius));
            });
        }
        ctx.lineTo(end.x, end.y)
    },
    /**
     * 初始化被隐藏的连线数据
     * @returns {Array|flow.line.hide|{horizontal, vertical}}
     */
    initHideLine() {
        this.line.hide = {vertical: [], horizontal: []};
        this.line.normal.forEach(obj => {
            if (this.config.closedItems.find(item => {
                    return item[0] === obj.start[0] && item[1] === obj.start[1]
                        || item[0] === obj.end[0] && item[1] === obj.end[1]
                })) {
                obj.points.forEach((point, i) => {
                    if (!i) return;
                    this.line.hide[point.x === obj.points[i - 1].x ? 'vertical' : 'horizontal'].push({
                        start: obj.points[i - 1],
                        end: point
                    });
                });
            }
        });

        return this.line.hide;
    }
};

export default flow;
