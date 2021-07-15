import '../../node_modules/bootstrap/dist/css/bootstrap.css';
import '../../node_modules/bootstrap-select/dist/css/bootstrap-select.min.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.min.css';
import '../css/main.scss';

/*
 *  The package bootstrap-select is not compatable with bootstrap 5 at the
 *  time of writing this. Once bootstrap-select has been upgraded to a stable
 *  version with bootstrap 5 support, the bootstrap 4 javascript import &
 *  it's dependency (bootstrap4) can be removed.
 */
import './attacher';
import '../../node_modules/bootstrap4/dist/js/bootstrap.bundle';
import '../../node_modules/bootstrap-select/dist/js/bootstrap-select';

import html2canvas from 'html2canvas';

import './color_change';
import { removeTouchHoverCSSRule } from './utils';

$(function() {
    // Disclaimer modal
    // if (getCookie('disclaimer') !== 'shown') {
    //     $('#disclaimer-modal').modal({
    //         keyboard: false,
    //         backdrop: 'static',
    //     });
    //     setCookie('disclaimer', 'shown', 90);
    // }

    // disable hover for touch screen devices
    removeTouchHoverCSSRule();

    $('.alert-dismissible .close').click(function() {
        $(this)
            .parent()
            .toggleClass('hide');
    });

    $('.quick-selection .btn').click(function() {
        $(this).blur();
    });

    $('.btn,#timetable').contextmenu(function() {
        return false;
    });

    // $('#CourseAllocationReport-btn').click(function () {
    //     $('#ExcelSheet').html('<iframe width="100%" height="100%" frameborder="0" scrolling="no" src="https://onedrive.live.com/embed?cid=D67270317C4D2130&resid=D67270317C4D2130%211971&authkey=AOBukor57oPwDlU&em=2&ActiveCell=\'WINSEM2016-17_CourseAllotted_Re\'!A1&Item=\'WINSEM2016-17_CourseAllotted_Re\'!A%3AN&wdHideGridlines=True&wdDownloadButton=True"></iframe>');
    //     $('#ExcelSheet').css('height', '35vh');
    // });

    // Timetable screenshot
    $('#takeScreenshotBtn').click(function() {
        // Hack: scroll to top gives better image with html2canvas
        window.scrollTo({
            top: 0,
            behavior: 'instant',
        });
        var timetable_img_src;
        var courseListTable_img_src;
        var newWindow_data = '';
        $('body').width('1500');
        $('.screenshot_msg').show();
        var newWindow = window.open();
        newWindow.document.write('<h1>Wait. Capturing screenshot...</h1>');
        // timetable screenshot
        html2canvas(document.getElementById('timetable')).then((canvas) => {
            timetable_img_src = canvas.toDataURL('image/jpeg');
            newWindow_data = `<html>
                <head><title>FFCS on The Go</title></head>
                <body>
                    <h1>Click on the respective images to download.</h1>
                    <br>
                    <h3>Timetable</h3>
                    <a href="${timetable_img_src}" download="FFCSOTG_MyTimeTable">
                        <img width="100%" src="${timetable_img_src}" alt="FFCSOTG_MyTimeTable"/>
                    </a>`;
            html2canvas(document.getElementById('courseListTable')).then(
                (canvas) => {
                    courseListTable_img_src = canvas.toDataURL('image/jpeg');
                    newWindow_data =
                        newWindow_data +
                        `<br><br>
                        <h3>Course List</h3>
                        <a href="${courseListTable_img_src}" download="FFCSOTG_MyCourses">
                            <img width="100%" src="${courseListTable_img_src}" alt="FFCSOTG_MyCourses"/>
                        </a>
                        </body></html>`;

                    // closing the document to clear the the current content
                    newWindow.document.close();
                    newWindow.document.write(newWindow_data);
                    newWindow.document.close();
                    $('.screenshot_msg').hide();
                    $('body').width('initial');
                },
            );
        });
        ga('send', {
            hitType: 'event',
            eventCategory: 'Timetable',
            eventAction: 'click',
            eventLabel: 'Screenshot',
        });
    });

    $('header .alert-dismissible a').click(function() {
        ga('send', {
            hitType: 'event',
            eventCategory: 'Promotion',
            eventAction: 'click',
            eventLabel: 'GitHub',
        });
    });

    $('#shareWhatsApp a').click(function() {
        ga('send', {
            hitType: 'event',
            eventCategory: 'Share',
            eventAction: 'click',
            eventLabel: 'WhatsApp',
        });
    });
});

// open github repo on ctrl+u
document.onkeydown = function(e) {
    if (e.ctrlKey && (e.keyCode === 117 || e.keyCode === 85)) {
        window.open('https://github.com/vatz88/FFCSonTheGo');
        return false;
    } else {
        return true;
    }
};

// Setup a listener to track Add to Homescreen events.
window.addEventListener('beforeinstallprompt', (e) => {
    ga('send', {
        hitType: 'event',
        eventCategory: 'A2H',
        eventAction: 'Seen',
        eventLabel: `A2H Shown`,
    });
    e.userChoice.then((choiceResult) => {
        ga('send', {
            hitType: 'event',
            eventCategory: 'A2H',
            eventAction: 'click',
            eventLabel: `A2H ${choiceResult.outcome}`,
        });
    });
});

// const Sentry = require('@sentry/browser');
// Sentry.init({
//     dsn: 'https://2108314c87344a6c9c4d1db1e82b5d05@sentry.io/1487980',
// });
