import localforage from 'localforage';
import { resetFilterSlotArr, addSlotButtons } from './autocomplete_course';

let timeTableStorage = [
    {
        id: 0,
        name: 'Default Table',
        data: [],
    },
];

let activeTable = timeTableStorage[0];

var highlighted = {
    0: [],
    highlight: function(id) {
        if (highlighted[id]) {
            highlighted[id].forEach(function(slot) {
                $('#timetable .' + slot).addClass('highlight');
                if ($('.quick-selection .' + slot + '-tile')) {
                    $('.quick-selection .' + slot + '-tile').addClass(
                        'highlight',
                    );
                }
            });
            $('.quick-selection button')
                .not('[disabled]')
                .each(function() {
                    if (
                        $('#timetable .' + this.classList[0].split('-')[0]).not(
                            '.highlight',
                        ).length === 0
                    ) {
                        $(this).addClass('highlight');
                    }
                });
        } else {
            highlighted[id] = [];
        }
    },
};

let isDefaultDeletable = false;

$(function() {
    // load localForage data
    (function() {
        localforage
            .getItem('timeTableStorage')
            .then(function(storedValue) {
                timeTableStorage = storedValue || timeTableStorage;
                activeTable = timeTableStorage[0];

                fillPage(activeTable.data);
                updateTableDropdownLabel(activeTable.name);

                // Renaming the 'Default Table' option
                $('#saved-tt-picker .tt-picker-label a')
                    .first()
                    .text(activeTable.name);

                // After the first table is deleted, the id may not be 0 anymore
                timeTableStorage[0].id = 0;

                timeTableStorage.slice(1).forEach(function(table) {
                    addTableDropdownButton(table.id, table.name);
                });
            })
            .catch(console.error);
    })();

    // addColorChangeEvents(); quick visualization disabled by default

    // Disable On Click Selection
    $('#toggleClickToSelect').click(function() {
        if ($(this).attr('data-state') === 'enabled') {
            $('i', this).prop('class', 'fas fa-eye');
            $('span', this).html('&nbsp;&nbsp;Enable Quick Visualization');
            $(this).attr('data-state', 'disabled');
            $('.quick-selection *[class*="-tile"]').off();
            $('#timetable .TimetableContent').off();
        } else {
            $('i', this).prop('class', 'fas fa-eye-slash');
            $('span', this).html('&nbsp;&nbsp;Disable Quick Visualization');
            addColorChangeEvents();
            $(this).attr('data-state', 'enabled');
        }

        $('.quick-selection').slideToggle();
    });

    // Toggle extra fields in slot selection area
    $('#slot-sel-area-toggle-fields-btn').click(function() {
        var toggle = $('#slot-sel-area-toggle-fields-btn');

        if (
            toggle
                .text()
                .toLowerCase()
                .includes('show')
        ) {
            toggle.text('Hide Advanced Options');
            toggle.attr('class', 'btn btn-secondary');
        } else {
            toggle.text('Show Advanced Options');
            toggle.attr('class', 'btn btn-outline-secondary');
        }

        $('#slot-sel-area-toggle-fields').slideToggle();
    });

    $('#addCourseBtn').click(function() {
        var course = $('#inputCourse')
            .val()
            .trim();
        var faculty = $('#inputFaculty')
            .val()
            .trim();
        var slotString = $('#inputSlotString')
            .val()
            .toUpperCase()
            .trim();
        var venue = $('#inputVenue')
            .val()
            .trim();
        var credits = $('#inputCourseCredits')
            .val()
            .trim();
        var isProject = $('#inputIsProject').val();
        $('#inputIsProject').val('false'); // Reset the value once we read it.

        if (slotString === '') {
            $('#inputSlotString').focus();
            return;
        }

        var slotArray = (function() {
            var arr = [];
            try {
                slotString.split(/\s*\+\s*/).forEach(function(el) {
                    if (el && $('.' + el)) {
                        arr.push(el);
                    }
                });
            } catch (error) {
                arr = [];
            }
            return arr;
        })();

        // Add new course to the end of the array.
        var courseId;
        if (activeTable.data.length === 0) {
            courseId = 0;
        } else {
            var lastAddedCourse = activeTable.data[activeTable.data.length - 1];
            courseId = lastAddedCourse[0] + 1;
        }

        var courseSplit = course.split('-');
        var courseCode = courseSplit[0].trim();
        var courseTitle = courseSplit
            .slice(1)
            .join('-')
            .trim();

        // [0: courseId, 1: courseCode, 2:courseTitle, 3: faculty, 4: slotArray, 5: venue, 6: credits, 7: isProject]
        activeTable.data.push([
            courseId,
            courseCode,
            courseTitle,
            faculty,
            slotArray,
            venue,
            credits,
            isProject,
        ]);

        addCourseToTimetable(courseId, courseCode, venue, slotArray, isProject);
        insertCourseToCourseListTable(
            courseId,
            courseCode,
            courseTitle,
            faculty,
            slotArray,
            venue,
            credits,
            isProject,
        );
        checkSlotClash();
        updateLocalForage();
    });

    // Load course again in the panel
    $('#courseListTable').on('dblclick', 'tr:not(:last-child)', function(e) {
        var slotString = $(this)
            .find('td')
            .not('[colspan]')
            .eq(0)
            .text();
        var courseCode = $(this)
            .find('td')
            .eq(1)
            .text();
        var courseTitle = $(this)
            .find('td')
            .eq(2)
            .text();
        var faculty = $(this)
            .find('td')
            .eq(3)
            .text();
        var venue = $(this)
            .find('td')
            .eq(4)
            .text();
        var credits = $(this)
            .find('td')
            .eq(5)
            .text();

        $('#inputCourse')
            .val(courseCode + ' - ' + courseTitle)
            .trigger('change');
        $('#inputFaculty')
            .val(faculty)
            .trigger('change');
        $('#inputSlotString')
            .val(slotString)
            .trigger('change');
        $('#inputVenue')
            .val(venue)
            .trigger('change');
        $('#inputCourseCredits')
            .val(credits)
            .trigger('change');

        addSlotButtons(courseCode);

        $(this)
            .find('.close')
            .click();

        // scroll back to panel
        if (e.target.localName !== 'th') {
            $('html, body').animate({
                scrollTop: 0,
            });
        }
    });

    // delete course from table
    $('#courseListTable').on('click', '.close', removeCourse);

    $('#courseListTable th')
        .not(':last')
        .click(function() {
            var $this = $(this);
            var isSorted = false;

            // check if the column is already sorted
            if ($this.hasClass('sorted')) {
                isSorted = true;
            }

            $('#courseListTable th.sorted').removeClass(
                'sorted ascending descending',
            );

            var items = retrieveColumnItems($this);
            var ascending = false;

            // check if the column is sorted in ascending order
            if (isSorted) {
                for (var i = 0; i < items.length; i++) {
                    var current = $(items[i]).text();
                    var next = $(items[i + 1]).text();

                    if (current < next) {
                        ascending = true;
                        break;
                    }
                }
            }

            // if sorted in ascending order
            if (isSorted && ascending) {
                // sort in descending order
                items.sort(function(a, b) {
                    return $(a).text() < $(b).text() ? 1 : -1;
                });
                $this.addClass('sorted descending');
            } else {
                // sort in ascending order
                items.sort(function(a, b) {
                    return $(a).text() > $(b).text() ? 1 : -1;
                });
                $this.addClass('sorted ascending');
            }

            // get the corresponding rows of the sorted column items
            var sortedCourseRows = $(items).map(function(i, item) {
                return $(item)
                    .parent()
                    .get();
            });

            // rerender the rows
            $('#courseListTable tbody tr')
                .not('tr:last')
                .remove();
            $('#courseListTable tbody #totalCreditsTr').before(
                sortedCourseRows,
            );
        });

    // Reset current table not all tables
    $('#reset-table').click(function() {
        clearPage();
        activeTable.data = [];
        updateLocalForage();
        highlighted[activeTable.id] = [];
        // Clear Multiselect
        $('#filter-by-slot').html('');
        resetFilterSlotArr();
        $('#filter-by-slot').prop('disabled', true) &&
            $('#filter-by-slot').selectpicker &&
            $('#filter-by-slot').selectpicker('refresh');
    });

    // Clear course from panel
    $('#clearCourseBtn').click(function() {
        $('#slot-sel-area input').val('');
        $('#insertCourseSelectionOptions').html('');
        // Clear Multiselect
        $('#filter-by-slot').html('');
        resetFilterSlotArr();
        $('#filter-by-slot').prop('disabled', true) &&
            $('#filter-by-slot').selectpicker &&
            $('#filter-by-slot').selectpicker('refresh');
    });

    // Switch table on click
    $('#saved-tt-picker').on('click', '.tt-picker-label', function() {
        var selectedTableId = Number(
            $(this)
                .children('a')
                .data('table-id'),
        );
        switchTable(selectedTableId);
    });

    // Opening the edit modal
    $('#saved-tt-picker').on('click', '.tt-picker-edit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var tableId = Number(
            $(this)
                .closest('a')
                .data('table-id'),
        );
        var tableName = $(
            $(this)
                .closest('li')
                .find('[data-table-id="' + tableId + '"]')[0],
        ).text();

        $('#table-name').val(tableName);
        $('#edit-table').data('table-id', tableId);
    });

    // Renaming the table
    $('#edit-table').on('click', function() {
        var tableId = $(this).data('table-id');
        var tableName = $('#table-name')
            .val()
            .trim();

        if (tableName == '') {
            tableName = 'Unititled Table';
        }

        renameTable(tableId, tableName);
    });

    // Renaming the table using the Enter key
    $('#table-name').on('keydown', function(e) {
        if (e.key == 'Enter') {
            $('#edit-table').trigger('click');
        }
    });

    // Opening the delete modal
    $('#saved-tt-picker').on('click', '.tt-picker-remove', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var tableId = Number(
            $(this)
                .closest('a')
                .data('table-id'),
        );

        $('#delete-table').data('table-id', tableId);
    });

    // Deleting a table
    $('#delete-table').on('click', function() {
        var tableId = $(this).data('table-id');

        $('.tt-picker-label')
            .find('[data-table-id="' + tableId + '"]')[0]
            .closest('li')
            .remove();
        removeTable(tableId);

        if (timeTableStorage.length == 1) {
            $('#saved-tt-picker .tt-picker-remove')
                .first()
                .remove();
            isDefaultDeletable = false;
        }
    });

    // Add table button
    $('#saved-tt-picker-add').click(function() {
        var newTableId = timeTableStorage[timeTableStorage.length - 1].id + 1;
        var newTableName = 'Table ' + newTableId;
        timeTableStorage.push({
            id: newTableId,
            name: newTableName,
            data: [],
        });
        addTableDropdownButton(newTableId, newTableName);
        switchTable(newTableId);
        updateLocalForage();
        highlighted[newTableId] = [];
    });

    // load course data with autocomplete
    $('#campus-btn-group :input').change(function(event) {
        window.location.hash = event.target.value;
    });
    loadCourseData();
});

function addColorChangeEvents() {
    $('#timetable .TimetableContent:not([disabled])').click(function() {
        if (
            !$(this).hasClass('clash') &&
            $(this).children('div').length === 0
        ) {
            $(this).toggleClass('highlight');
            if (!$(this).hasClass('highlight')) {
                $(
                    '.quick-selection .' + this.classList[1] + '-tile',
                ).removeClass('highlight');
                // remove slots from highlighted
                var index = highlighted[activeTable.id].indexOf(
                    this.classList[2],
                );
                highlighted[activeTable.id].splice(index, 1);
                return;
            } else {
                // add slots to highlighted
                if (this.classList.length === 3) {
                    // some course may only have lab slot
                    highlighted[activeTable.id].push(this.classList[1]);
                } else {
                    highlighted[activeTable.id].push(this.classList[2]);
                }
            }
            if (
                $('#timetable .' + this.classList[1]).not('.highlight')
                    .length === 0
            ) {
                $('.quick-selection .' + this.classList[1] + '-tile').addClass(
                    'highlight',
                );
            }
        }
    });
    $('.quick-selection *[class*="-tile"]').click(function() {
        if (
            !$('#timetable .' + this.classList[0].split('-')[0]).hasClass(
                'clash',
            ) &&
            $('#timetable .' + this.classList[0].split('-')[0]).children('div')
                .length === 0
        ) {
            if ($(this).hasClass('highlight')) {
                $('#timetable .' + this.classList[0].split('-')[0]).removeClass(
                    'highlight',
                );
                // remove slots from highlighted
                var index = highlighted[activeTable.id].indexOf(
                    this.classList[0].split('-')[0],
                );
                highlighted[activeTable.id].splice(index, 1);
            } else {
                $('#timetable .' + this.classList[0].split('-')[0]).addClass(
                    'highlight',
                );
                // add slots to highlighted
                highlighted[activeTable.id].push(
                    this.classList[0].split('-')[0],
                );
            }
            $(this).toggleClass('highlight');
        }
    });
}

function addCourseToTimetable(
    courseId,
    courseCode,
    venue,
    slotArray,
    isProject,
) {
    slotArray.forEach(function(slot) {
        var $divElement = $(
            '<div data-course="' +
                'course' +
                courseId +
                '" data-is-lab="' +
                (slot[0] === 'L') +
                '" data-is-project="' +
                isProject +
                '">' +
                courseCode +
                '-' +
                venue +
                '</div>',
        );
        $('#timetable tr .' + slot)
            .addClass('highlight')
            .append($divElement);
        if ($('.quick-selection .' + slot + '-tile')) {
            $('.quick-selection .' + slot + '-tile').addClass('highlight');
        }
    });
}

function insertCourseToCourseListTable(
    courseId,
    courseCode,
    courseTitle,
    faculty,
    slotArray,
    venue,
    credits,
    isProject,
) {
    var $trElement = $(
        '<tr data-course="' +
            'course' +
            courseId +
            '" data-is-project="' +
            isProject +
            '">' +
            '<td>' +
            slotArray.join('+') +
            '</td>' +
            '<td>' +
            courseCode +
            '</td>' +
            '<td>' +
            courseTitle +
            '</td>' +
            '<td>' +
            faculty +
            '</td>' +
            '<td>' +
            venue +
            '</td>' +
            '<td>' +
            credits +
            '</td>' +
            '<td><i class="fas fa-times close"></i></td>' +
            '</tr>',
    );

    var previousRow = $('#courseListTable tbody #totalCreditsTr');
    var sortedColumn = $('#courseListTable th.sorted')[0];

    // if any column is sorted, find the position of this course
    if (sortedColumn) {
        var index = getColumnIndex(sortedColumn);
        var items = retrieveColumnItems(sortedColumn);
        var currentElement = $trElement.find('td')[index];

        // a variation of insertion sort
        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if ($(currentElement).text() <= $(item).text()) {
                previousRow = $(item).parent();
                break;
            }
        }
    }

    previousRow.before($trElement);

    // update credits
    updateCredits();
}

function getColumnIndex(column) {
    var columns = [
        'Slot',
        'Course Code',
        'Course Title',
        'Faculty',
        'Venue',
        'Credits',
    ];
    var columnText = $(column).text();
    var index = columns.indexOf(columnText);

    return index;
}

function retrieveColumnItems(column) {
    var index = getColumnIndex(column);

    var courseRows = $('#courseListTable tbody').find('tr');
    courseRows = courseRows.slice(0, -1);

    var items = $(courseRows).map(function(i, row) {
        return $(row).find('td')[index];
    });

    return items;
}

function updateCredits() {
    var totalCredits = 0;
    $('#courseListTable tbody tr')
        .not('#totalCreditsTr')
        .each(function() {
            // 6th column is credits column
            totalCredits += Number(
                $(this)
                    .children('td')
                    .eq(5)
                    .text(),
            );
        });
    $('#totalCredits').text(totalCredits);
}

function checkSlotClash() {
    // Remove table-danger class (shows clashing) form tr in course list table.
    $('#courseListTable tbody tr').removeClass('table-danger');
    $('#timetable tr .hidden').removeClass('hidden');

    // Check clash from timetable in each slot area
    $('#timetable tr .highlight').each(function() {
        var $highlightedCell = $(this);
        var $highlightedCellDivs = $(this).children('div[data-course]');

        var noPostLabFlag =
            $(this).hasClass('noPostLab') &&
            $(this).children('div[data-is-lab="false"]').length > 0 &&
            $(this)
                .next()
                .children('div[data-is-lab="true"]').length > 0;
        var noPreTheoryFlag =
            $(this).hasClass('noPreTheory') &&
            $(this).children('div[data-is-lab="true"]').length > 0 &&
            $(this)
                .prev()
                .children('div[data-is-lab="false"]').length > 0;

        if (
            $highlightedCellDivs.length > 1 ||
            noPostLabFlag ||
            noPreTheoryFlag
        ) {
            var isClashing = true;

            // Check if there are two dissimilar courses or if there is a J
            // component course and a sibling in this cell.
            if ($highlightedCellDivs.length === 2) {
                var $firstCellDiv = $highlightedCellDivs.eq(0),
                    $secondCellDiv = $highlightedCellDivs.eq(1);

                var isFirstCourseJComp = $firstCellDiv.data('is-project'),
                    isSecondCourseJComp = $secondCellDiv.data('is-project');

                if (isFirstCourseJComp && isSecondCourseJComp) {
                } // Two J components in the same slot is a clash.
                else if (isFirstCourseJComp || isSecondCourseJComp) {
                    // Otherwise, check for similarity.
                    var firstCourseId = +$firstCellDiv
                        .data('course')
                        .split(/(\d+)/)[1];
                    var secondCourseId = +$secondCellDiv
                        .data('course')
                        .split(/(\d+)/)[1];

                    var firstCourseIdx = getIndexByCourseId(firstCourseId);
                    var secondCourseIdx = getIndexByCourseId(secondCourseId);

                    var firstCourse = activeTable.data[firstCourseIdx];
                    var secondCourse = activeTable.data[secondCourseIdx];

                    // Check to see if two courses are similar.
                    if (
                        firstCourse[1] === secondCourse[1] && // Course Code
                        firstCourse[2] === secondCourse[2] // Course Title
                    ) {
                        $highlightedCell.removeClass('clash');
                        var $projectDiv = isFirstCourseJComp
                            ? $firstCellDiv
                            : $secondCellDiv;
                        $projectDiv.addClass('hidden');
                        isClashing = false;
                    }
                }
            }

            if (isClashing) {
                // clash
                // remove, add clash in timetable
                $(this).addClass('clash');
                // show clash in course list table
                $(this)
                    .children('div[data-course]')
                    .each(function() {
                        var dataCourse = $(this).attr('data-course');
                        // Add table-danger class to tr of clashing course list table.
                        $(
                            '#courseListTable tbody tr[data-course="' +
                                dataCourse +
                                '"]',
                        ).addClass('table-danger');
                    });
            }
        } else if ($highlightedCellDivs.length === 1) {
            // no clash
            $(this)
                .removeClass('clash')
                .addClass('highlight');
        } else {
            // no course present
            $(this).removeClass('clash highlight');
            $('.quick-selection .' + this.classList[1] + '-tile').removeClass(
                'highlight',
            );
        }
    });
}

function removeCourse(e) {
    e.stopPropagation();
    var dataCourse = $(this)
        .closest('tr')
        .attr('data-course');

    $('#timetable tr td div[data-course="' + dataCourse + '"]').remove();
    $('#courseListTable tbody tr[data-course="' + dataCourse + '"]').remove();

    checkSlotClash();
    updateCredits();

    var courseId = Number(dataCourse.split(/(\d+)/)[1]);
    for (var i = 0; i < activeTable.data.length; ++i) {
        if (activeTable.data[i][0] == courseId) {
            activeTable.data.splice(i, 1);
            break;
        }
    }

    updateLocalForage();
}

function getIndexByCourseId(courseId) {
    return activeTable.data.findIndex(function(elem) {
        return elem[0] === courseId;
    });
}

// Simply clears all the added content in the page but doesn't reset the data in memory.
function clearPage() {
    $('#timetable .TimetableContent').removeClass('highlight clash');
    $('.quick-selection *[class*="-tile"]').removeClass('highlight');
    $('#slot-sel-area input').val('');
    if ($('#timetable tr div[data-course]')) {
        $('#timetable tr div[data-course]').remove();
    }
    if ($('#courseListTable tbody tr[data-course]')) {
        $('#courseListTable tbody tr[data-course]').remove();
    }
    $('#insertCourseSelectionOptions').html('');
    updateCredits();
}

// Fills the page with the courses (array) passed.
function fillPage(data) {
    $.each(data, function(index, arr) {
        var courseId = arr[0];
        var courseCode = arr[1];
        var courseTitle = arr[2];
        var faculty = arr[3];
        var slotArray = arr[4];
        var venue = arr[5];
        var credits = arr[6];
        var isProject = arr[7];

        // index is basically courseId
        addCourseToTimetable(courseId, courseCode, venue, slotArray, isProject);
        insertCourseToCourseListTable(
            courseId,
            courseCode,
            courseTitle,
            faculty,
            slotArray,
            venue,
            credits,
            isProject,
        );
    });
    checkSlotClash();
}

function switchTable(tableId) {
    clearPage();

    for (var i = 0; i < timeTableStorage.length; i++) {
        if (tableId == timeTableStorage[i].id) {
            activeTable = timeTableStorage[i];
            updateTableDropdownLabel(activeTable.name);
            fillPage(activeTable.data);
            // return;
            break;
        }
    }
    highlighted.highlight(tableId);
}

function updateTableDropdownLabel(tableName) {
    $('#saved-tt-picker-label').text(tableName);
}

function removeTable(tableId) {
    for (var i = 0; i < timeTableStorage.length; ++i) {
        if (timeTableStorage[i].id == tableId) {
            // If it is the active table, change activeTable.
            if (activeTable.id == tableId) {
                if (i == 0) {
                    switchTable(timeTableStorage[1].id);
                } else {
                    switchTable(timeTableStorage[i - 1].id);
                }
            }
            timeTableStorage.splice(i, 1);
            updateLocalForage();
            return;
        }
    }
}

function renameTable(tableId, tableName) {
    for (var i = 0; i < timeTableStorage.length; i++) {
        if (timeTableStorage[i].id == tableId) {
            timeTableStorage[i].name = tableName;
            updateLocalForage();

            // If active table is renamed
            if (activeTable.id == tableId) {
                updateTableDropdownLabel(tableName);
            }

            // Renaming the dropdown item
            $(
                $('.tt-picker-label').find(
                    '[data-table-id="' + tableId + '"]',
                )[0],
            ).text(tableName);

            return;
        }
    }
}

function addTableDropdownButton(tableId, tableName) {
    $('#saved-tt-picker').append(
        '<li>' +
            '<table class="dropdown-item">' +
            '<td class="tt-picker-label"><a href="JavaScript:void(0);" data-table-id="' +
            tableId +
            '">' +
            tableName +
            '</a></td>' +
            '<td>' +
            '<a class="tt-picker-edit" href="JavaScript:void(0);" data-table-id="' +
            tableId +
            '" data-bs-toggle="modal" data-bs-target="#edit-modal"><i class="fas fa-edit"></i></a>' +
            '<a class="tt-picker-remove" href="JavaScript:void(0);" data-table-id="' +
            tableId +
            '" data-bs-toggle="modal" data-bs-target="#delete-modal"><i class="fas fa-trash"></i></a>' +
            '</td>' +
            '</table>' +
            '</li>',
    );

    if (!isDefaultDeletable) {
        $('#saved-tt-picker .tt-picker-edit')
            .first()
            .after(
                '<a class="tt-picker-remove" href="JavaScript:void(0);" data-table-id="0" data-bs-toggle="modal" data-bs-target="#delete-modal"><i class="fas fa-trash"></i></a>',
            );

        isDefaultDeletable = true;
    }
}

// save data through localForage
function updateLocalForage() {
    localforage
        .setItem('timeTableStorage', timeTableStorage)
        .catch(console.error);
}

// load course data with autocomplete
function loadCourseData() {
    require('easy-autocomplete');
    require('./autocomplete_course');
    require('../../node_modules/easy-autocomplete/dist/easy-autocomplete.css');
    // require('bootstrap-select');
    const {
        initAutocomplete,
        postInitAutocomplete,
    } = require('./autocomplete_course');
    initAutocomplete(window.location.hash === '#Chennai');
    postInitAutocomplete();
    if (window.location.hash === '#Chennai') {
        $('#campus').text('Chennai Campus');
    } else {
        $('#campus').text('Vellore Campus');
    }
    $(window).on('hashchange', () => {
        initAutocomplete(window.location.hash === '#Chennai');
        if (window.location.hash === '#Chennai') {
            $('#campus').text('Chennai Campus');
        } else {
            $('#campus').text('Vellore Campus');
        }
    });
}
