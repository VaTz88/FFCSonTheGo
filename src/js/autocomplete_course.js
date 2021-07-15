// import $ from 'jquery';

export let filterSlotArr = [];
export function resetFilterSlotArr(params) {
    filterSlotArr = [];
}

const courses_data = {
    unique_courses: [],
    all_data: [],
};

export function initAutocomplete(isChennai) {
    if (isChennai) {
        courses_data.all_data = require('../data/all_data_chennai.json');
        courses_data.unique_courses = require('../data/unique_courses_chennai.json');
    } else {
        courses_data.all_data = require('../data/all_data.json');
        courses_data.unique_courses = require('../data/unique_courses.json');
    }

    // autocomplete options
    var courseOptions = {
        data: courses_data.unique_courses,

        getValue: function(el) {
            return el.CODE + ' - ' + el.TITLE;
        },

        list: {
            match: {
                enabled: true,
            },

            maxNumberOfElements: 10,

            onSelectItemEvent: function() {
                var title = $('#inputCourse').getSelectedItemData().TITLE;
                var code = $('#inputCourse').getSelectedItemData().CODE;
                $('#inputCourse')
                    .val(code + ' - ' + title)
                    .trigger('change');
                addSlotButtons(code);
            },
        },
    };

    $('#inputCourse').easyAutocomplete(courseOptions);
    $('div.easy-autocomplete').removeAttr('style'); // for dynamic width
}

export function postInitAutocomplete() {
    $('#slot-sel-area input[type="text"]').keyup(function(e) {
        if (e.which === 13) {
            $(this).blur();
        }
    });

    $('#insertCourseSelectionOptions').on('click', 'button', function() {
        $('.list-group-item.selected').each(function() {
            $(this).attr('class', 'list-group-item');
        });

        $(this).attr('class', 'list-group-item selected');

        var slot = $(this).data('slot');
        var faculty = $(this).data('faculty');
        var type = $(this).data('type');
        var venue = $(this).data('venue');
        var credits = $(this).data('credits');

        $('#inputSlotString').val(slot);
        $('#inputFaculty').val(faculty);
        $('#inputVenue').val(venue);
        $('#inputCourseCredits').val(credits);
        $('#inputIsProject').val(type === 'EPJ' ? 'true' : 'false');
    });

    $('#insertCourseSelectionOptions').on('dblclick', 'button', function() {
        $('#addCourseBtn').click();
        $(this).blur();
    });

    // Initalize the slot filter
    $('#filter-by-slot').on('changed.bs.select', function(
        e,
        clickedIndex,
        isSelected,
        previousValue,
    ) {
        var option = $('option', this)[clickedIndex].value;
        var filterIndex = filterSlotArr.indexOf(option);

        if (isSelected) {
            if (filterIndex == -1) {
                filterSlotArr.push(option);
            }
        } else {
            if (filterIndex != -1) {
                filterSlotArr.splice(filterIndex, 1);
            }
        }

        // Show all the slots first, then hide whatever is not in filterSlotArr
        $('#insertCourseSelectionOptions button').show();
        if (filterSlotArr.length) {
            $('#insertCourseSelectionOptions button')
                .not(function(i, el) {
                    var elSlot = $(el).data('slot');

                    if (filterSlotArr.indexOf(elSlot) != -1) {
                        return true;
                    } else {
                        return false;
                    }
                })
                .hide();
        }
    });
    $('#filter-by-slot').selectpicker('refresh');

    // Hack to turn off auto focus
    $('#filter-by-slot').on('change', function() {
        $(this)
            .siblings('.dropdown-menu')
            .children('.bs-searchbox')
            .children('input[type="search"]')
            .trigger('blur');
    });
}

// Add slot selection buttons from array of slots
function getSlotSelectionButton(
    code,
    title,
    type,
    slot,
    faculty,
    credits,
    venue,
) {
    var $slotButton = $(
        '<button type="button" class="list-group-item"></button>',
    );
    var $h6 = $('<h6 class="list-group-item-heading"></h6>');
    var $p = $('<p class="list-group-item-text"></p>');

    $h6.text(slot);
    $p.text([faculty, venue, type].join(' | '));
    $slotButton.append($h6);
    $slotButton.append($p);

    $slotButton.data('code', code);
    $slotButton.data('title', title);
    $slotButton.data('slot', slot);
    $slotButton.data('faculty', faculty);
    $slotButton.data('type', type);
    $slotButton.data('venue', venue);
    $slotButton.data('credits', credits);

    return $slotButton;
}

export function addSlotButtons(code) {
    $('#insertCourseSelectionOptions').html('');
    $('#filter-by-slot').html('');

    resetFilterSlotArr();

    var theorySlotGroupSelect = [];
    var labSlotGroupSelect = [];

    $.each(courses_data.all_data, function(key, value) {
        if (value.CODE === code) {
            var $slotButton = getSlotSelectionButton(
                value.CODE,
                value.TITLE,
                value.TYPE,
                value.SLOT,
                value.FACULTY,
                (value.CREDITS || '').toString(),
                value.VENUE,
            );

            // Build Multiselect group list
            if (value.SLOT[0] === 'L') {
                if (labSlotGroupSelect.indexOf(value.SLOT) === -1) {
                    labSlotGroupSelect.push(value.SLOT);
                }
            } else {
                if (theorySlotGroupSelect.indexOf(value.SLOT) === -1) {
                    theorySlotGroupSelect.push(value.SLOT);
                }
            }

            $('#insertCourseSelectionOptions').append($slotButton);
        }
    });

    // Multiselect Theory
    if (theorySlotGroupSelect.length) {
        var $theorySlotGroupSelect = $('<optgroup label="Theory"></optgroup>');
        theorySlotGroupSelect.forEach(function(el) {
            var $option = $('<option value="' + el + '">' + el + '</option>');
            $theorySlotGroupSelect.append($option);
        });
        $('#filter-by-slot').append($theorySlotGroupSelect);
    }

    if (labSlotGroupSelect.length) {
        // Multiselect Lab
        var $labSlotGroupSelect = $('<optgroup label="Lab"></optgroup>');
        labSlotGroupSelect.forEach(function(el) {
            var $option = $('<option value="' + el + '">' + el + '</option>');
            $labSlotGroupSelect.append($option);
        });
        $('#filter-by-slot').append($labSlotGroupSelect);
    }

    if ($('#filter-by-slot option').length) {
        $('#filter-by-slot').prop('disabled', false);
    } else {
        $('#filter-by-slot').prop('disabled', true);
    }

    $('#filter-by-slot').selectpicker('refresh');
}
