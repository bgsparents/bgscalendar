var CwClueDirection;
(function (CwClueDirection) {
    CwClueDirection["across"] = "across";
    CwClueDirection["down"] = "down";
})(CwClueDirection || (CwClueDirection = {}));
var CwCell = /** @class */ (function () {
    function CwCell(cw, x, y) {
        this.cw = cw;
        this.x = x;
        this.y = y;
        this.type = 'block';
        this.id = x + '-' + y;
    }
    CwCell.prototype.isBlock = function () {
        return this.type == 'block';
    };
    CwCell.prototype.nextX = function (n) {
        var cx = this.x - 1;
        for (var i = 1; i < this.cw.width; ++i) {
            var x = (cx + this.cw.width + (i * n)) % this.cw.width;
            var cell = this.cw.cell(x + 1, this.y);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    };
    CwCell.prototype.nextY = function (n) {
        var cy = this.y - 1;
        for (var i = 1; i < this.cw.height; ++i) {
            var y = (cy + this.cw.height + (i * n)) % this.cw.height;
            var cell = this.cw.cell(this.x, y + 1);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    };
    CwCell.prototype.next = function (n, direction, haltAtClueBoundary) {
        var currentId;
        if (direction === CwClueDirection.across) {
            var cell = this.nextX(n);
            if (cell.across === this.across || cell.x > (this.x * n)) {
                return cell;
            }
            currentId = this.across;
        }
        else {
            var cell = this.nextY(n);
            if (cell.down === this.down || cell.y > (this.y * n)) {
                return cell;
            }
            currentId = this.down;
        }
        if (!haltAtClueBoundary) {
            var next = (currentId - 1 + this.cw.clues.length + n) % this.cw.clues.length;
            return this.cw.clue(next + 1).firstCell;
        }
        return this;
    };
    return CwCell;
}());
var CwCrossword = /** @class */ (function () {
    function CwCrossword(data) {
        var wordXml = data.find("word");
        this.title = $(data.find("metadata")).find("title").text();
        this.initClues(data.find("clue"), wordXml);
        this.initGrid(data.find("grid"), wordXml);
    }
    CwCrossword.loadXml = function (url, callback, error) {
        $.get(url, function (data) {
            callback(new CwCrossword($(data)));
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (error) {
                error(errorThrown);
            }
            else {
                alert("Failed to load crossword data");
                console.error("Failed to load crossword data - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
            }
        });
    };
    CwCrossword.loadIndependentXml = function (code, callback, error) {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback, error);
    };
    CwCrossword.prototype.clue = function (id) {
        if (id > this.clues.length) {
            id = 1;
        }
        else if (id < 1) {
            id = this.clues.length;
        }
        return this.clues[id - 1];
    };
    CwCrossword.prototype.cell = function (x, y) {
        return this.grid[x - 1][y - 1];
    };
    CwCrossword.prototype.cellFromId = function (cellId) {
        var coord = cellId.split("-").map(function (n) { return parseInt(n); });
        return this.cell(coord[0], coord[1]);
    };
    CwCrossword.prototype.initClues = function (cluesXml, wordXml) {
        var _this = this;
        this.clues = new Array(wordXml.length);
        cluesXml.each(function (i, node) {
            var clueXml = $(node);
            var id = parseInt(clueXml.attr('word'));
            if (clueXml.attr('is-link')) {
            }
            else {
                _this.clues[id - 1] = {
                    id: id,
                    number: clueXml.attr('number'),
                    format: clueXml.attr('format'),
                    clue: clueXml.text()
                };
            }
        });
    };
    CwCrossword.prototype.initGrid = function (gridXml, wordXml) {
        var _this = this;
        this.width = parseInt(gridXml.attr('width'));
        this.height = parseInt(gridXml.attr('height'));
        this.grid = new Array(this.width);
        for (var x = 0; x < this.width; ++x) {
            this.grid[x] = new Array(this.height);
            for (var y = 0; y < this.height; ++y) {
                this.grid[x][y] = new CwCell(this, x + 1, y + 1);
            }
        }
        gridXml.find('cell').each(function (i, node) {
            var cellXml = $(node);
            var cell = _this.cell(parseInt(cellXml.attr('x')), parseInt(cellXml.attr('y')));
            cell.number = cellXml.attr('number');
            cell.solution = cellXml.attr('solution');
        });
        wordXml.each(function (i, wordNode) {
            var word = $(wordNode);
            var id = parseInt(word.attr('id'));
            _this.wordToGrid(id, word, true);
            word.find('cells').each(function (i, link) {
                _this.wordToGrid(id, $(link), false);
            });
        });
    };
    CwCrossword.prototype.wordToGrid = function (id, word, firstClue) {
        var xl = word.attr('x').split('-').map(function (n) { return parseInt(n); });
        var yl = word.attr('y').split('-').map(function (n) { return parseInt(n); });
        var clue = this.clue(id);
        if (firstClue) {
            clue.firstCell = this.cell(xl[0], yl[0]);
        }
        if (xl.length > 1) {
            for (var x = xl[0]; x <= xl[1]; ++x) {
                this.cell(x, yl[0]).across = id;
                this.cell(x, yl[0]).type = 'letter';
            }
        }
        else {
            for (var y = yl[0]; y <= yl[1]; ++y) {
                this.cell(xl[0], y).down = id;
                this.cell(xl[0], y).type = 'letter';
            }
        }
    };
    return CwCrossword;
}());
var CwBoardCell = /** @class */ (function () {
    function CwBoardCell() {
    }
    return CwBoardCell;
}());
var CwBoard = /** @class */ (function () {
    function CwBoard(crossword) {
        this.answerListeners = [];
        this.locationListeners = [];
        this.noteListeners = [];
        this.lettersTotal = 0;
        this.lettersFilled = 0;
        this.crossword = crossword;
        this.drawGrid();
        this.hookupKeyboard();
        this.hookupNotes();
        var firstCell = this.crossword.clue(1).firstCell;
        this.focused = {};
        this.focus(firstCell, firstCell.across ? CwClueDirection.across : CwClueDirection.down);
        this.moveFocus(this.crossword.clue(1).firstCell);
    }
    CwBoard.loadXml = function (url, callback) {
        CwCrossword.loadXml(url, function (cw) {
            callback(new CwBoard(cw));
        });
    };
    CwBoard.loadIndependentXml = function (code, callback) {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback);
    };
    CwBoard.prototype.drawGrid = function () {
        var that = this;
        this.gridContainer = $('#grid_container').css({
            width: 'calc(2rem * ' + this.crossword.width + ' + ' + (this.crossword.width + 1) + ' * 2px)'
        });
        this.gridTable = $("#grid");
        for (var y = 1; y <= this.crossword.height; ++y) {
            var row = $('<tr>');
            var _loop_1 = function (x) {
                var tableCell = $('<td>');
                var cell = this_1.crossword.cell(x, y);
                if (cell.type === 'block') {
                    tableCell.addClass('block');
                }
                else {
                    this_1.lettersTotal++;
                    if (cell.number) {
                        tableCell.append($('<span>' + cell.number + '</span>').addClass('number'));
                    }
                    tableCell.append($('<div>').addClass('letter'));
                    if (cell.across) {
                        tableCell.addClass('c' + cell.across);
                    }
                    if (cell.down) {
                        tableCell.addClass('c' + cell.down);
                    }
                    cell.cell = tableCell;
                    tableCell.attr('id', cell.id);
                    tableCell.attr('tabindex', x + y * this_1.crossword.width);
                    tableCell.data('cell', cell);
                    tableCell.focus(function (e) { that.letterFocus(e, cell); });
                    tableCell.click(function (e) { that.letterFocus(e, cell); });
                    tableCell.keydown(function (e) { that.keyDownListener(e, cell); });
                }
                row.append(tableCell);
            };
            var this_1 = this;
            for (var x = 1; x <= this.crossword.width; ++x) {
                _loop_1(x);
            }
            this.gridTable.append(row);
        }
    };
    CwBoard.prototype.backspace = function () {
        this.setFocused('');
        this.moveFocus(this.focused.cell.next(-1, this.focused.direction, true));
    };
    CwBoard.prototype.delete = function () {
        this.setFocused('');
    };
    CwBoard.prototype.letter = function (letter) {
        this.setFocused(letter.toUpperCase());
        var nextCell = this.focused.cell.next(1, this.focused.direction, false);
        this.moveFocus(this.focused.cell.next(1, this.focused.direction, false));
    };
    CwBoard.prototype.setLetter = function (cell, value) {
        var el = $("#" + cell.id + " .letter");
        var currentValue = el.text();
        if (currentValue == value) {
            return;
        }
        el.text(value);
        cell.cell.toggleClass('wrong', value.length > 0 && value != cell.solution);
        this.lettersFilled += value.length - currentValue.length;
        $("#complete_percentage").text(Math.floor(100 * this.lettersFilled / this.lettersTotal));
        this.checkSolutions();
    };
    CwBoard.prototype.getLetter = function (cell) {
        var el = $("#" + cell.id + " .letter");
        return el.text();
    };
    CwBoard.prototype.checkSolutions = function () {
        var el = $("#complete");
        if (this.lettersFilled == this.lettersTotal) {
            var hasMistake = false;
            for (var x = 1; x <= this.crossword.width; ++x) {
                for (var y = 1; y <= this.crossword.height; ++y) {
                    var cell = this.crossword.cell(x, y);
                    if (!cell.isBlock() && this.getLetter(cell) != cell.solution) {
                        hasMistake = true;
                    }
                }
            }
            el.addClass(hasMistake ? 'wrong' : 'right');
        }
        else {
            el.removeClass("wrong right");
        }
    };
    CwBoard.prototype.setFocused = function (value) {
        this.setLetter(this.focused.cell, value);
        this.fireAnswerListeners(this.focused.cell, value);
    };
    CwBoard.prototype.fireAnswerListeners = function (cell, answer) {
        this.answerListeners.forEach(function (l) { l(cell, answer); });
    };
    CwBoard.prototype.fireLocationListeners = function (cell) {
        this.locationListeners.forEach(function (l) { l(cell); });
    };
    CwBoard.prototype.keyDownListener = function (e, cell) {
        if (e.which === 37) {
            this.moveFocus(this.focused.cell.nextX(-1));
        }
        else if (e.which === 38) {
            this.moveFocus(this.focused.cell.nextY(-1));
        }
        else if (e.which === 39) {
            this.moveFocus(this.focused.cell.nextX(1));
        }
        else if (e.which === 40) {
            this.moveFocus(this.focused.cell.nextY(1));
        }
        else if (e.which === 8) {
            this.backspace();
        }
        else if (e.which === 32) {
            this.letter('');
        }
        else if (e.which === 46) {
            this.delete();
        }
        else if ((e.which > 64 && e.which < 91) || (e.which > 96 && e.which < 123)) {
            this.letter(String.fromCharCode(e.which));
        }
    };
    CwBoard.prototype.hookupKeyboard = function () {
        var _this = this;
        $("#keyboard span").click(function (e) {
            if (!_this.focused) {
                return;
            }
            var key = $(e.target).text();
            var action = $(e.target).data("action");
            if (key === 'BS') {
                _this.backspace();
            }
            else if (key === 'DEL') {
                _this.delete();
            }
            else if (action === 'prev') {
                _this.moveFocus(_this.crossword.clue(_this.focused.id - 1).firstCell);
            }
            else if (action === 'next') {
                _this.moveFocus(_this.crossword.clue(_this.focused.id + 1).firstCell);
            }
            else if (action === 'right') {
                _this.moveFocus(_this.focused.cell.nextX(1));
            }
            else if (action === 'up') {
                _this.moveFocus(_this.focused.cell.nextY(-1));
            }
            else if (action === 'left') {
                _this.moveFocus(_this.focused.cell.nextX(-1));
            }
            else if (action === 'down') {
                _this.moveFocus(_this.focused.cell.nextY(1));
            }
            else {
                _this.letter(key);
            }
            _this.moveFocus(_this.focused.cell);
        });
    };
    CwBoard.prototype.hookupNotes = function () {
        var _this = this;
        $("#notes-input").keyup(function (e) {
            var note = $("#notes-input").val();
            _this.crossword.clue(_this.focused.id).note = note;
            _this.fireNoteListeners(_this.focused.id, note);
        });
    };
    CwBoard.prototype.fireNoteListeners = function (clueId, note) {
        this.noteListeners.forEach(function (l) { l(clueId, note); });
    };
    CwBoard.prototype.moveFocus = function (cell) {
        cell.cell.focus();
    };
    CwBoard.prototype.letterFocus = function (e, cell) {
        var direction = this.focused.direction;
        if (e.type === 'click' && this.focused && cell.id === this.focused.letter) {
            if (this.focused.id === cell.across && cell.down) {
                direction = CwClueDirection.down;
            }
            else if (this.focused.id === cell.down && cell.across) {
                direction = CwClueDirection.across;
            }
        }
        else if (this.focused && (this.focused.id === cell.down || this.focused.id === cell.across)) {
            direction = this.focused.direction;
        }
        else if (direction == CwClueDirection.across && !cell.across) {
            direction = CwClueDirection.down;
        }
        else if (direction == CwClueDirection.down && !cell.down) {
            direction = CwClueDirection.across;
        }
        this.focus(cell, direction);
    };
    CwBoard.prototype.focus = function (cell, direction) {
        this.focused.direction = direction;
        this.focused.id = direction == CwClueDirection.across ? cell.across : cell.down;
        this.focused.letter = cell.id;
        this.focused.cell = cell;
        var clue = this.crossword.clue(this.focused.id);
        $('.focus').removeClass('focus');
        $('#' + cell.id).addClass('focus');
        $('.highlight').removeClass('highlight');
        $('.c' + this.focused.id).addClass('highlight');
        $('body').toggleClass('down', direction == CwClueDirection.down);
        $('body').toggleClass('across', direction == CwClueDirection.across);
        $('#ic_number').text(clue.number);
        $('#ic_clue').text(clue.clue);
        $('#ic_format').text('(' + clue.format + ')');
        this.updateNote();
        this.fireLocationListeners(cell);
    };
    CwBoard.prototype.update = function (uuid, data) {
        for (var cellId in data.grid) {
            this.setLetter(this.crossword.cellFromId(cellId), data.grid[cellId].letter);
        }
        if (data.notes) {
            for (var clueId in data.notes) {
                var note = data.notes[clueId].note;
                var clue = this.crossword.clue(parseInt(clueId));
                clue.note = note;
                clue.firstCell.cell.toggleClass('has-note', note.trim() != '');
            }
        }
        if (data.solvers) {
            $('.watched').removeClass('watched');
            var keys = Object.keys(data.solvers);
            var now = new Date().getTime();
            for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                var key = keys_1[_i];
                var solver = data.solvers[key];
                if (key != uuid && (now - solver.timestamp) < 300000) {
                    $('#' + solver.cellId).addClass('watched');
                }
            }
        }
        this.updateNote();
    };
    CwBoard.prototype.updateNote = function () {
        var el = $("#notes-input");
        if (!el.get(0).matches(":focus")) {
            var note = this.crossword.clue(this.focused.id).note;
            el.val(note ? note : '');
        }
    };
    CwBoard.prototype.registerNoteListener = function (listener) {
        this.noteListeners.push(listener);
    };
    CwBoard.prototype.registerLocationListener = function (listener) {
        this.locationListeners.push(listener);
    };
    CwBoard.prototype.registerAnswerListener = function (listener) {
        this.answerListeners.push(listener);
    };
    return CwBoard;
}());
var CwStorage = /** @class */ (function () {
    function CwStorage(id) {
        this.patchData = {};
        this.id = id;
        this.data = {};
    }
    CwStorage.prototype.age = function () {
        return Math.floor((new Date().getTime() - this.refreshed.getTime()) / 1000);
    };
    CwStorage.prototype.fetch = function (callback, error) {
        var _this = this;
        if (Object.keys(this.patchData).length > 0) {
            this.pushActual(callback);
        }
        else {
            $.get("https://extendsclass.com/api/json-storage/bin/" + this.id + "?cb=" + new Date().getTime(), function (data) {
                _this.updateData(JSON.parse(data));
                _this.refreshed = new Date();
                callback(_this.data);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (error) {
                    error(errorThrown);
                }
                else {
                    //alert("Failed to load storage");
                    console.error("Failed to load storage - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
                }
            });
        }
    };
    CwStorage.prototype.pushLetter = function (key, value, callback) {
        var data = {
            grid: {}
        };
        data.grid[key] = {
            letter: value
        };
        this.push(data, callback);
    };
    CwStorage.prototype.pushNotes = function (key, value, callback) {
        var data = {
            notes: {}
        };
        data.notes[key] = {
            note: value
        };
        this.push(data, callback);
    };
    CwStorage.prototype.pushLocation = function (uuid, cellId, callback) {
        var data = {
            solvers: this.data.solvers
        };
        if (!data.solvers) {
            data.solvers = {};
        }
        if (!data.solvers[uuid]) {
            data.solvers[uuid] = {};
        }
        data.solvers[uuid].timestamp = new Date().getTime();
        data.solvers[uuid].cellId = cellId;
        data.solvers[uuid].version = "v001";
        this.push(data, callback);
    };
    CwStorage.prototype.push = function (data, callback) {
        this.patchData = this.merge(this.patchData, data);
    };
    CwStorage.prototype.merge = function (target, source) {
        for (var _i = 0, _a = Object.keys(source); _i < _a.length; _i++) {
            var key = _a[_i];
            if (source[key] instanceof Object) {
                if (!target[key]) {
                    target[key] = {};
                }
                Object.assign(source[key], this.merge(target[key], source[key]));
            }
        }
        return Object.assign(target || {}, source);
    };
    CwStorage.prototype.pushActual = function (callback) {
        var _this = this;
        var data = this.patchData;
        data['code'] = this.data.code;
        this.patchData = {};
        $.ajax({
            type: "PATCH",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(data),
            success: function (response) {
                _this.updateData(JSON.parse(response.data));
                callback(response);
            },
            error: function () {
                console.error("error: merging data back into patch data");
                _this.patchData = _this.merge(_this.patchData, data);
                alert("couldn't update db");
            },
            contentType: "application/merge-patch+json",
            dataType: "json"
        });
    };
    CwStorage.prototype.save = function () {
        $.ajax({
            type: "PUT",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(this.data),
            success: function (response) {
                console.log("Full data save for recovery");
            },
            error: function () { alert("couldn't update db"); },
            contentType: "application/json",
            dataType: "json"
        });
    };
    CwStorage.prototype.updateData = function (data) {
        this.refreshed = new Date();
        if (data.code) {
            this.data = data;
        }
        else {
            if (this.data.code) {
                console.log("merging patch data into data");
                this.data = this.merge(this.data, this.patchData);
                console.log("saving");
                this.save();
            }
        }
    };
    CwStorage.create = function (crossword, code, callback) {
        var data = { code: code, grid: {} };
        $.ajax({
            type: "POST",
            url: "https://extendsclass.com/api/json-storage/bin",
            data: JSON.stringify(data),
            success: function (response) { callback(response.id); },
            error: function () { alert("Couldn't create db"); },
            contentType: "application/json",
            dataType: "json"
        });
    };
    return CwStorage;
}());
var CwApp = /** @class */ (function () {
    function CwApp(id) {
        this.id = id;
        this.uuid = this.fetchUuid();
        $('body').addClass(this.hasId() ? 'has-id' : 'no-id');
    }
    CwApp.prototype.start = function () {
        var _this = this;
        if (this.hasId()) {
            this.storage = new CwStorage(this.id);
            this.storage.fetch(function (data) { return _this.initBoard(data); }, this.showForm);
        }
        else {
            this.showForm();
        }
    };
    CwApp.prototype.hasId = function () {
        return !!this.id;
    };
    CwApp.prototype.uuidv4 = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    CwApp.prototype.fetchUuid = function () {
        var uuid;
        if (window.localStorage) {
            uuid = window.localStorage.getItem("cw-uuid");
        }
        else {
            uuid = this.getCookie("cw-uuid");
        }
        if (!uuid) {
            uuid = this.uuidv4();
            if (window.localStorage) {
                window.localStorage.setItem("cw-uuid", uuid);
            }
            else {
                this.setCookie("cw-uuid", uuid, 365);
            }
        }
        return uuid;
    };
    CwApp.prototype.getCookie = function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    };
    CwApp.prototype.setCookie = function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    };
    CwApp.prototype.initBoard = function (data) {
        var _this = this;
        $('body').addClass('has-id');
        CwBoard.loadIndependentXml(data.code, function (board) {
            _this.board = board;
            _this.board.update(_this.uuid, data);
            _this.board.registerAnswerListener(_this.storageAnswerUpdate.bind(_this));
            _this.board.registerNoteListener(_this.storageNoteUpdate.bind(_this));
            _this.board.registerLocationListener(_this.storageLocationUpdate.bind(_this));
            $("#title").text(_this.board.crossword.title);
            _this.intervalId = window.setInterval(_this.storageIntervalRefresh.bind(_this), 2000);
            _this.focusId = window.setInterval(_this.locationRefresh.bind(_this), 150000);
            window.setInterval(_this.ageRefresh.bind(_this), 1000);
            document.addEventListener("visibilitychange", _this.browserFocusListener.bind(_this));
        });
    };
    CwApp.prototype.storageAnswerUpdate = function (cell, answer) {
        var _this = this;
        this.storage.pushLetter(cell.id, answer, function (data) {
            _this.board.update(_this.uuid, data);
        });
    };
    CwApp.prototype.storageNoteUpdate = function (clueId, note) {
        var _this = this;
        this.storage.pushNotes(clueId, note, function (data) {
            _this.board.update(_this.uuid, data);
        });
    };
    CwApp.prototype.storageLocationUpdate = function (cell) {
        var _this = this;
        this.storage.pushLocation(this.uuid, cell.id, function (data) {
            _this.board.update(_this.uuid, data);
        });
    };
    CwApp.prototype.browserFocusListener = function (e) {
        window.clearInterval(this.intervalId);
        window.clearInterval(this.focusId);
        if (document.visibilityState === 'visible') {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 2000);
            this.focusId = window.setInterval(this.locationRefresh.bind(this), 150000);
            this.locationRefresh();
        }
        else {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 60000);
        }
    };
    CwApp.prototype.ageRefresh = function () {
        $("#last-refresh").text("Refreshed " + this.storage.age() + "s ago");
    };
    CwApp.prototype.locationRefresh = function () {
        this.storage.pushLocation(this.uuid, this.board.focused.cell.id, null);
    };
    CwApp.prototype.storageIntervalRefresh = function () {
        var _this = this;
        this.storage.fetch(function (data) {
            _this.board.update(_this.uuid, data);
        });
    };
    CwApp.prototype.showForm = function () {
        var _this = this;
        $('body').addClass('no-id');
        $('#cw-button').click(function () {
            var code = $('#cw-code').val();
            if (code !== '') {
                _this.setCode(code);
            }
        });
    };
    CwApp.prototype.setCode = function (code) {
        var _this = this;
        CwCrossword.loadIndependentXml(code, function (cw) {
            CwStorage.create(cw, code, _this.createSuccess);
        });
    };
    CwApp.prototype.createSuccess = function (id) {
        window.location.href += "#" + id;
        window.location.reload();
    };
    return CwApp;
}());
var app = new CwApp(window.location.hash ? window.location.hash.substr(1) : null);
app.start();
//# sourceMappingURL=crossword.js.map