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
            if (cell.across === this.across && cell.x > (this.x * n)) {
                return cell;
            }
            currentId = cell.across;
        }
        else {
            var cell = this.nextY(n);
            if (cell.down === this.down && cell.y > (this.y * n)) {
                return cell;
            }
            currentId = cell.down;
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
        return this.clues[id - 1];
    };
    CwCrossword.prototype.cell = function (x, y) {
        return this.grid[x - 1][y - 1];
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
        this.noteListeners = [];
        this.crossword = crossword;
        this.focused = {};
        this.drawGrid();
        this.hookupKeyboard();
        this.hookupNotes();
        var firstCell = this.crossword.clue(1).firstCell;
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
        this.moveFocus(this.focused.cell.next(1, this.focused.direction, false));
    };
    CwBoard.prototype.setFocused = function (value) {
        $("#" + this.focused.cell.id + " .letter").text(value);
        this.fireAnswerListeners(this.focused.cell, value);
    };
    CwBoard.prototype.fireAnswerListeners = function (cell, answer) {
        this.answerListeners.forEach(function (l) { l(cell, answer); });
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
            if (key === 'BS') {
                _this.backspace();
            }
            else if (key === 'DEL') {
                _this.delete();
            }
            else {
                console.log(key);
                _this.letter(key);
            }
            _this.moveFocus(_this.focused.cell);
        });
    };
    CwBoard.prototype.hookupNotes = function () {
        var _this = this;
        $("#notes-input").blur(function (e) {
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
        else if (cell.down) {
            direction = CwClueDirection.down;
        }
        else if (cell.across) {
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
        $('#ic_number').text(clue.number);
        $('#ic_clue').text(clue.clue);
        $('#ic_format').text('(' + clue.format + ')');
        this.updateNote();
    };
    CwBoard.prototype.update = function (data) {
        for (var cellId in data.grid) {
            $('#' + cellId + ' .letter').text(data.grid[cellId].letter);
        }
        if (data.notes) {
            for (var clueId in data.notes) {
                var note = data.notes[clueId].note;
                var clue = this.crossword.clue(parseInt(clueId));
                clue.note = note;
                clue.firstCell.cell.toggleClass('has-note', note.trim() != '');
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
    CwBoard.prototype.registerAnswerListener = function (listener) {
        this.answerListeners.push(listener);
    };
    return CwBoard;
}());
var CwStorage = /** @class */ (function () {
    function CwStorage(id) {
        this.id = id;
        this.data = {};
    }
    CwStorage.prototype.age = function () {
        return Math.floor((new Date().getTime() - this.refreshed.getTime()) / 1000);
    };
    CwStorage.prototype.fetch = function (callback, error) {
        var _this = this;
        $.get("https://extendsclass.com/api/json-storage/bin/" + this.id + "?cb=" + new Date().getTime(), function (data) {
            _this.refreshed = new Date();
            _this.data = JSON.parse(data);
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
    CwStorage.prototype.push = function (data, callback) {
        var _this = this;
        $.ajax({
            type: "PATCH",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(data),
            success: function (response) {
                _this.refreshed = new Date();
                _this.data = response;
                callback(response);
            },
            error: function () { alert("couldn't update db"); },
            contentType: "application/merge-patch+json",
            dataType: "json"
        });
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
    CwApp.prototype.initBoard = function (data) {
        var _this = this;
        $('body').addClass('has-id');
        CwBoard.loadIndependentXml(data.code, function (board) {
            _this.board = board;
            _this.board.update(data);
            _this.board.registerAnswerListener(_this.storageAnswerUpdate.bind(_this));
            _this.board.registerNoteListener(_this.storageNoteUpdate.bind(_this));
            $("#title").text(_this.board.crossword.title);
            window.setInterval(_this.storageIntervalRefresh.bind(_this), 2000);
            window.setInterval(_this.ageRefresh.bind(_this), 1000);
        });
    };
    CwApp.prototype.storageAnswerUpdate = function (cell, answer) {
        var _this = this;
        this.storage.pushLetter(cell.id, answer, function (data) {
            _this.board.update(data);
        });
    };
    CwApp.prototype.storageNoteUpdate = function (clueId, note) {
        var _this = this;
        this.storage.pushNotes(clueId, note, function (data) {
            _this.board.update(data);
        });
    };
    CwApp.prototype.ageRefresh = function () {
        $("#last-refresh").text("Refreshed " + this.storage.age() + "s ago");
    };
    CwApp.prototype.storageIntervalRefresh = function () {
        var _this = this;
        this.storage.fetch(function (data) {
            _this.board.update(data);
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