const lstUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle";
const date_format = 'DD/MM/YYYY hh:mm A';
let ind = 0;
const icons = {
    time: "icon-clock",
    date: "icon-calendar",
    up: "icon-up",
    down: "icon-down",
    previous: 'icon-left-open',
    next: 'icon-right-open',
    clear: 'icon-trash',
    close: 'icon-times'
};
$.fn.datetimepicker.Constructor.Default = $.extend({}, $.fn.datetimepicker.Constructor.Default, {
    icons: icons,
    format: date_format,
    sideBySide: true
});
Vue.use(VeeValidate);
const app = new Vue({
    el: '#app',
    data: {
        loading: false,
        approver: true,
        user: _spPageContextInfo.userId,
        position: '',
        itinerary: [{
            from: '',
            to: '',
            budget_code: '',
            start: null,
            end: null,
            amount: 0,
            days: 0,
            manager: null
        }],
        travel_purpose: '',
        total_amount: 0,
        travel_advance: '',
        advance_amount: null,
        advance_comment: null,
        budget_codes: [],
        per_diems: [],
        bosses: [],
        ticket_booking: null,
        ticket_booking_comment: '',
        accommodation_booking: null,
        accommodation_booking_comment: '',
        company_vehicle: null,
        company_vehicle_comment: ''
    },
    methods: {
        addDestination() {
            this.itinerary.push({
                from: '',
                to: '',
                budget_code: '',
                start: null,
                end: null,
                amount: 0,
                days: 0,
                manager: null
            });
            ++ind;
            setPickers(ind);
        },
        removeDestination() {
            this.itinerary.pop();
        },
        validateForm() {
            this.$validator.validateAll().then(valid => {
                if (valid) {
                    this.postForm();
                }
            });
        },
        postForm() {
            this.loading = true;
            let amt = "0";
            if (this.advance_amount != null) {
                amt = this.advance_amount.replace(',', '');
            }
            let item = {
                "__metadata": {"type": "SP.Data.TravelListItem"},
                TravelPurpose: this.travel_purpose,
                TravelAdvance: this.travel_advance,
                TravelAmount: this.total_amount,
                AdvanceAmount: parseFloat(amt),
                AdvanceComment: this.advance_comment,
                AirTicketBooking: this.ticket_booking,
                AirTicketBookingComment: this.ticket_booking_comment,
                AccomodationBooking: this.accommodation_booking,
                AccomodationBookingComment: this.accommodation_booking_comment,
                CompanyVehicle: this.company_vehicle,
                CompanyVehicleComment: this.company_vehicle_comment,
                TravellerId: parseInt(this.user),
                Status: 'Pending',
                Count: this.itinerary.length,
                ReviewCount:0
            };
            postJson("('Travel')/items", item, postItinerary, onError);
        },
        getRateByDestination(dest) {
            let a = this.per_diems.filter(x => {
                return x.Title === dest
            });
            if (a.length > 0) {
                return a[0].Amount;
            } else {
                return 0;
            }
        },
        getManagerByCode(b) {
            let a = this.budget_codes.filter(x => {
                return x.Title === b
            });
            if (a.length > 0) {
                return a[0].Manager.Id;
            } else {
                return 0;
            }
        },
    },
    computed: {
        assistant() {
            return this.bosses.length > 0;
        }
    },
    watch: {
        itinerary: {
            handler: function (n) {
                let amt = 0;
                let it = this.itinerary;
                let count = it.length;
                let i = 0;
                it.forEach(x => {
                    x.amount = this.getRateByDestination(x.to);
                    let d = getDays(x.start, x.end);

                    if (i === 0) d -= reduceDaysBy(x.start);
                    if (i === count - 1) d -= reduceDaysBy(x.end);
                    x.days = d;
                    amt += x.amount * x.days;
                    i++;
                });
                Object.assign(this.itinerary,it);
                if (isNaN(amt)) amt = 0;
                this.total_amount = amt;
            },
            deep: true
        },
        advance_amount: function (newValue) {
            const result = newValue.replace(/\D/g, "")
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            Vue.nextTick(() => this.advance_amount = result);
        }
    }
});

function reduceDaysBy(x) {
    const f = 'hh:mm A';
    const noon_date = moment('01/01/2000 11:59 AM', date_format);
    const time_part = moment(x, date_format).format(f);
    let new_date = '01/01/2000 ' + time_part;
    new_date = moment(new_date, date_format);

    if (new_date.isAfter(noon_date)) {
        return 0.5
    } else {
        return 0;
    }
}

function getDays(start, end) {
    let st = moment(start, date_format);
    let en = moment(end, date_format);
    return en.startOf('day').diff(st.startOf('day'), 'days');
}

/** load prerequisites**/
(function loadBatch() {
    let commands = [];
    let batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, {'X-RequestDigest': $('#__REQUESTDIGEST').val()});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('PA')/items?$select=Boss/Id,Boss/Title&$expand=Boss&$filter=PAId eq " + _spPageContextInfo.userId;
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "PA"});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('BudgetCodes')/items?$select=Title,Manager/Id,Manager/Title&$expand=Manager";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "BudgetCodes"});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('PerDiem')/items?$select=Title,Amount&$top=2000";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "PerDiem"});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = _spPageContextInfo.webAbsoluteUrl + "/_api/SP.UserProfiles.PeopleManager/GetMyProperties?&$select=UserProfileProperties,DirectReports";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "Profile"});

    batchExecutor.executeAsync().done(function (result) {
        $.each(result, function (k, v) {
            let command = $.grep(commands, function (command) {
                return v.id === command.id;
            });
            if (command[0].title === "PA") {
                getBosses(v.result.result.value);
            } else if (command[0].title === "BudgetCodes") {
                getBudgetCodes(v.result.result.value);
            } else if (command[0].title === "PerDiem") {
                getPerDiems(v.result.result.value);
            } else if (command[0].title === "Profile") {
                getProfile(v.result.result);
            }

        });
    }).fail(function (err) {
        onError(err);
    });
}());

function getProfile(d) {
    app.approver = d.DirectReports.length > 0;
    d = d.UserProfileProperties;
    for (let i = 0; i < d.length; i++) {
        if (d[i].Key == "SPS-JobTitle") {
            app.position = d[i].Value;
            break;
        }
    }
}

function getBosses(d) {
    let bolst = [];
    d.forEach((j) => {
        bolst.push({'label': j.Boss.Title, 'value': j.Boss.Id});
    });

    if (bolst.length > 0) {
        bolst.push({'label': _spPageContextInfo.userDisplayName, 'value': _spPageContextInfo.userId});
        app.bosses.push(...bolst);
        setTimeout(function () {
            $('select[name ="user"]').select2();
            $('select[name ="user"]').on('select2:select', function (e) {
                app.user = e.params.data.id;
            });
        }, 1500);
    }
    bolst = [];
}

function getBudgetCodes(d) {
    let blst = [];
    let approver = false;
    d.forEach((j) => {
        blst.push(j);
        if (j.Manager.Id === _spPageContextInfo.userId) {
            approver = true;
        }
    });
    app.approver = approver;
    app.budget_codes.push(...blst);
    blst = [];
}

function getPerDiems(d) {
    let diemlist = [];
    d.forEach((j) => {
        diemlist.push({Title: j.Title, Amount: j.Amount});
    });
    app.per_diems.push(...diemlist);
    diemlist = [];
}

/** end load prerequisites**/

function postItinerary(data) {
    let travel_id = data.d.Id;
    let commands = [];
    let batches = 0;

    let batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, {'X-RequestDigest': $('#__REQUESTDIGEST').val()});

    app.itinerary.forEach(function (item, index) {
        batchRequest = new BatchRequest();
        batchRequest.endpoint = lstUrl + "('Itinerary')/items";
        batchRequest.payload = {
            '__metadata': {'type': 'SP.Data.ItineraryListItem'},
            'TravelId': travel_id,
            'From': item.from,
            'To': item.to,
            'StartDate': moment(item.start, date_format).toISOString(),
            'EndDate': moment(item.end, date_format).toISOString(),
            'BudgetCode': item.budget_code,
            'BudgetManagerId': item.manager,
            'Amount': parseInt(item.amount),
            'Days': parseInt(item.days)
        };
        batchRequest.verb = "POST";
        commands.push({id: batchExecutor.loadChangeRequest(batchRequest), title: 'Itinerary_' + index});
    });

    batchExecutor.executeAsync().done(function (result) {
        $.each(result, function (k, v) {
            let command = $.grep(commands, function (command) {
                return v.id === command.id;
            });
            app.itinerary.forEach(function (item, index) {
                if (command[0].title === "Itinerary_" + index) {
                    ++batches;
                    if (batches === app.itinerary.length) {
                        this.loading = false;
                        Swal.fire("Success", "Travel request successful", "success")
                            .then(() => {
                                window.location.reload();
                            });
                    }
                }
            });
        });
    }).fail(function (err) {
        onError(err);
    });
}

function postJson(endpointUri, payload, success, error) {
    UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, this._spFormDigestRefreshInterval);
    $.ajax({
        url: lstUrl + endpointUri,
        type: "POST",
        data: JSON.stringify(payload),
        contentType: "application/json;odata=verbose",
        headers: {"Accept": "application/json;odata=verbose", "X-RequestDigest": $("#__REQUESTDIGEST").val()},
        success: success,
        error: onError
    });
}

function onError(error) {
    Swal.fire("Error", error.responseText, "error");
}

function setPickers(x) {
    $("#start_" + x).datetimepicker();
    $("#end_" + x).datetimepicker({useCurrent: false});
    $(document).on('change.datetimepicker', '#start_' + x, function (e) {
        $('#end_' + x).datetimepicker('minDate', e.date);
        app.itinerary[x].start = e.date.format(date_format);
    });
    $(document).on('change.datetimepicker', '#end_' + x, function (e) {
        $('#start_' + x).datetimepicker('maxDate', e.date);
        app.itinerary[x].end = e.date.format(date_format);
    });
    setTimeout(function () {
        $('select[name ="from_' + x + '"]').select2();
        $('select[name ="to_' + x + '"]').select2();
        $('select[name ="budget_code_' + x + '"]').select2();

        $('select[name ="from_' + x + '"]').on('select2:select', function (e) {
            app.itinerary[x].from = e.params.data.text;
        });
        $('select[name ="to_' + x + '"]').on('select2:select', function (e) {
            app.itinerary[x].to = e.params.data.text;
        });
        $('select[name ="budget_code_' + x + '"]').on('select2:select', function (e) {
            app.itinerary[x].budget_code = e.params.data.text;
            app.itinerary[x].manager = app.getManagerByCode(e.params.data.text);
        });
    }, 1500);
}

setPickers(0);
