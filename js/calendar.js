// import moment = require('moment');
var CalendarModel = /** @class */ (function () {
    function CalendarModel(data, context) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }
    Object.defineProperty(CalendarModel.prototype, "classNames", {
        get: function () {
            return Object.keys(this._data.rota);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "currentDate", {
        get: function () {
            return this._currentDate;
        },
        set: function (date) {
            this._currentDate = date.startOf('isoWeek');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "classPickKey", {
        get: function () {
            return this._context ? 'pick-class-' + this._context : 'pick-class';
        },
        enumerable: true,
        configurable: true
    });
    CalendarModel.prototype.currentRota = function () {
        var weekRota = this._data.rota[this.currentClass];
        for (var _i = 0, _a = Object.keys(weekRota); _i < _a.length; _i++) {
            var key = _a[_i];
            var rota = weekRota[key];
            if (this.isRotaForWeek(rota)) {
                return rota;
            }
        }
        return undefined;
    };
    CalendarModel.prototype.extras = function (date) {
        return this._data.extras[date.format('YYYY-MM-DD')];
    };
    CalendarModel.prototype.isTermTime = function (date) {
        return this._data.termTimes.find(function (o) { return CalendarModel.containsDate(o, date); }) !== undefined;
    };
    CalendarModel.prototype.isHoliday = function (date) {
        return !this.isTermTime(date);
    };
    CalendarModel.containsDate = function (range, date) {
        return date.isBetween(range.start, range.end, 'day', '[]');
    };
    CalendarModel.prototype.isRotaForWeek = function (rota) {
        var weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    };
    return CalendarModel;
}());
var Calendar = /** @class */ (function () {
    function Calendar(data, context) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.init();
    }
    Object.defineProperty(Calendar.prototype, "pickedClass", {
        get: function () {
            try {
                var cls = localStorage.getItem(this.model.classPickKey);
                return !cls ? $($('.class-pick a')[0]).data('class') : cls;
            }
            catch (e) {
                return $($('.class-pick a')[0]).data('class');
            }
        },
        set: function (cls) {
            this.model.currentClass = cls;
            try {
                localStorage.setItem(this.model.classPickKey, cls);
            }
            catch (err) {
            }
            this.repaint();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Calendar.prototype, "currentDate", {
        set: function (date) {
            this.model.currentDate = date;
            this.repaint();
            Calendar.scrollBest();
        },
        enumerable: true,
        configurable: true
    });
    Calendar.prototype.paint = function () {
        this.paintClassPicker();
        this.model.currentClass = this.pickedClass;
        this.repaint();
    };
    Calendar.prototype.repaint = function () {
        this.repaintClassPicker();
        this.repaintHeaders();
        this.repaintCalendar();
    };
    Calendar.prototype.repaintHeaders = function () {
        var today = moment();
        var tomorrow = moment(today).add(1, 'day');
        for (var i = 0; i < 7; ++i) {
            var date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .find('.date').text(date.format("MMM Do"));
        }
    };
    Calendar.prototype.paintClassPicker = function () {
        for (var _i = 0, _a = this.model.classNames; _i < _a.length; _i++) {
            var key = _a[_i];
            this.classPicker.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                .data('class', key)
                .text(key)
                .addClass('class-' + key)));
        }
    };
    Calendar.prototype.repaintClassPicker = function () {
        this.classPicker.find('a').removeClass('active');
        this.classPicker.find('.class-' + this.model.currentClass).addClass('active');
    };
    Calendar.prototype.repaintCalendar = function () {
        $('.day .info').html('');
        var weekRota = this.model.currentRota();
        if (weekRota !== undefined) {
            for (var _i = 0, _a = Calendar.weekdays(); _i < _a.length; _i++) {
                var key = _a[_i];
                var dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo);
            }
        }
    };
    Calendar.prototype.repaintCalendarDay = function (day, info) {
        var date = $('.day.' + day).data('date');
        var extras = this.model.extras(date);
        var el = $('.day.' + day + ' .info');
        var dl = $('<dl></dl>')
            .append($('<dt>Uniform</dt>')).append($('<dd></dd>').text(info.uniform));
        if (info.games) {
            dl.append($('<dt>Games</dt>')).append($('<dd></dd>').text(info.games));
        }
        var kitUl = $('<ul></ul>');
        dl.append($('<dt>Kit</dt>')).append($('<dd></dd>').append(kitUl));
        if (extras && extras.kit) {
            for (var i = 0; i < extras.kit.length; ++i) {
                var item = '<span class="special">' + extras.kit[i] + '</span>';
                kitUl.append($('<li></li>').html(item));
            }
        }
        for (var i = 0; i < info.kit.length; ++i) {
            var item = info.kit[i];
            if (item.startsWith('*')) {
                item = '<span class="highlight">' + item.substring(1, item.length) + '</span>';
            }
            kitUl.append($('<li></li>').html(item));
        }
        if (info.timings && info.timings.length) {
            var dd = $('<dd></dd>');
            dl.append($('<dt>Timings</dt>')).append(dd);
            for (var i = 0; i < info.timings.length; ++i) {
                dd.append($('<div></div>')
                    .append($('<span></span>').text(info.timings[i].title))
                    .append($('<span class="float-right"></span>').text(info.timings[i].time)));
            }
        }
        el.append(dl);
    };
    Calendar.weekdays = function () {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    };
    Calendar.prototype.scrollWeek = function (weeks) {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    };
    Calendar.isMobileView = function () {
        return $(window).width() < 768;
    };
    Calendar.scrollBest = function () {
        if (!Calendar.isMobileView() || !Calendar.gotoToTodayOrTomorrow()) {
            Calendar.gotoTop();
        }
    };
    Calendar.gotoTop = function () {
        Calendar.scrollTo('#calendar-container');
    };
    Calendar.gotoToday = function () {
        Calendar.scrollTo('.day.today');
    };
    Calendar.gotoTomorrow = function () {
        Calendar.scrollTo('.day.tomorrow');
    };
    Calendar.gotoToTodayOrTomorrow = function () {
        if ($('.day.today').length) {
            Calendar.gotoToday();
            return true;
        }
        else if ($('.day.tomorrow').length) {
            Calendar.gotoTomorrow();
            return true;
        }
        return false;
    };
    Calendar.scrollTo = function (selector) {
        var tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({ scrollTop: tag.offset().top - $('.sticky-top').height() }, 'slow');
        }
    };
    Calendar.listener = function (fn) {
        return function (e) {
            e.preventDefault();
            fn(e);
        }.bind(this);
    };
    Calendar.prototype.listeners = function () {
        var _this = this;
        $('.class-pick a').click(Calendar.listener(function (e) { return _this.pickedClass = ($(e.target).data('class')); }));
        $('.prev-week').click(function () { return _this.scrollWeek(-1); });
        $('.this-week').click(function () { return _this.currentDate = moment(); });
        $('.next-week').click(function () { return _this.scrollWeek(1); });
        $('.key .today').click(function () { return Calendar.gotoToday(); });
        $('.key .tomorrow').click(function () { return Calendar.gotoTomorrow(); });
    };
    Calendar.prototype.init = function () {
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            Calendar.gotoToTodayOrTomorrow();
        }
    };
    return Calendar;
}());
//# sourceMappingURL=calendar.js.map