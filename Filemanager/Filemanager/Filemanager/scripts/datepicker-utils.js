$(function () {    

});

function intitDatepicker(name, tooltip, eventSelect) {

    $.datepicker.regional['uk'] = {
        closeText: 'Обрати',
        prevText: '&#x3c;',
        nextText: '&#x3e;',
        currentText: 'Поточний',
        monthNames: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
		                    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
        monthNamesShort: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
		                    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
        dayNames: ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п’ятниця', 'субота'],
        dayNamesShort: ['нед', 'пнд', 'вів', 'срд', 'чтв', 'птн', 'сбт'],
        dayNamesMin: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
        weekHeader: 'Не',

        firstDay: 1,
        isRTL: false,
        showMonthAfterYear: false,
        yearSuffix: ''
    };

    $.datepicker.setDefaults($.extend($.datepicker.regional["uk"]));
   
    var val = $("#" + name).val();
  
        $("#" + name).datepicker({
            showOn: "button",
            buttonImage: "/Filemanager/images/ico_calendar.gif",
            buttonImageOnly: true,
            changeMonth: true,
            changeYear: true,
            buttonText: tooltip,
            yearRange: "1920:2050",
            buttonText: "Оберіть дату",
            onSelect: function (dateText, inst) { if (eventSelect != null) eventSelect(); },
            onClose: function (dateText, inst) {
                if ($("#" + name).datepicker('getDate') != null) {
                    var month = parseInt($("#ui-datepicker-div .ui-datepicker-month :selected").val());
                    var year = parseInt($("#ui-datepicker-div .ui-datepicker-year :selected").val());
                    var day = $("#" + name).datepicker('getDate').getDate();
                    $(this).datepicker('setDate', new Date(year, month, day));
                    $(this).trigger("change");
                    $(this).trigger("blur");
                    $(this).valid();
                }
            }
        });
  
    $("#" + name).datepicker("option", "dateFormat", "dd.mm.yy");
    if (document.getElementById(name) != null) {
        document.getElementById(name).value = val;
    }

    //$("#" + name).mask("99.99.9999");
}
