const lstUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle";
const date_format = 'DD/MM/YYYY hh:mm A';
const app = new Vue({
    el: '#app',
    data: {
        loading: false,
        show: false,
        budget_manager:false,
        supervisor:false,
        travels: [],
        modform: {
            Traveller: {Title: ""},
            Id: null,
            TravelPurpose: "",
            TravelAdvance: false,
            TravelAmount: 0,
            AdvanceComment: "",
            AdvanceAmount: 0,
            AirTicketBooking: false,
            AirTicketBookingComment: "",
            AccomodationBooking: false,
            AccomodationBookingComment: "",
            CompanyVehicle: false,
            CompanyVehicleComment: "",
            Status: "",
            SupervisorId: {Title: ""},
            SupervisorComment: "",
            Created: ""
        },
        itineraries: []
    },
    methods: {
        toggle() {
            this.show = !this.show;
        },
        loadTravels(d) {
            let lst_travels = [];
            d.forEach(x => {
                lst_travels.push({
                    'Id': x.Id,
                    'TravelPurpose': x.TravelPurpose,
                    'TravelAmount': x.TravelAmount,
                    'Traveller': x.Traveller
                });
            });
            this.travels.push(...lst_travels);
            lst_travels = [];
        },
        openModal(id) {
            loadTravelNItinerary(id);
            this.toggle();
        },
        multiply(a){
            return a.Amount * a.Days;
        }
    },
    filters: {
        toCurrency(value) {
            if (typeof value !== "number") {
                return value;
            }
            var formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
            });
            return formatter.format(value);
        },
    },
    computed: {
        modalStyle() {
            return this.show ?
                { 'padding-left': '0px;', display: 'block' } : {};
        }
    },
    mounted() {
        loadBatch();
    }
});

function restCalls(list_url, error, f) {
    UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, this._spFormDigestRefreshInterval);
    $.ajax({
        url: lstUrl + list_url,
        method: "GET",
        headers: {
            "Accept": "application/json; odata=verbose"
        },
        success: function (data) {
            f(data.d.results)
        },
        error: function (error) {
            onError(error)
        }
    })
}

function onError(error) {
    Swal.fire("Error", error.responseText, "error");
}

function getTravel(d) {
    const {
        Traveller, Id, TravelPurpose, TravelAdvance,
        TravelAmount, AdvanceComment, AdvanceAmount,
        AirTicketBooking, AirTicketBookingComment, AccomodationBooking,
        AccomodationBookingComment, CompanyVehicle,
        CompanyVehicleComment, Status, Supervisor,
        SupervisorComment, Created
    } = d[0];
    let n = {
        Traveller, Id, TravelPurpose, TravelAdvance,
        TravelAmount, AdvanceComment, AdvanceAmount,
        AirTicketBooking, AirTicketBookingComment, AccomodationBooking,
        AccomodationBookingComment, CompanyVehicle,
        CompanyVehicleComment, Status, Supervisor,
        SupervisorComment, Created
    };
    n.Created = moment(Created).format(date_format);
    Object.assign(app.modform, n);
}

function getItinerary(d) {
    let it_list = [];
    d.forEach(j => {
        it_list.push({
            From: j.From, To: j.To, StartDate: moment(j.StartDate).format(date_format),
            EndDate: moment(j.EndDate).format(date_format), BudgetCode: j.BudgetCode,
            Days: j.Days, Amount: j.Amount, BudgetManager: j.BudgetManager.Title
        });
    });
    app.itineraries.push(...it_list);
    it_list = [];
}

function loadTravelNItinerary(id) {
    let commands = [];
    let batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, {'X-RequestDigest': $('#__REQUESTDIGEST').val()});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Travel')/items?&$select=*,Traveller/Title,Supervisor/Title&$expand=Traveller,Supervisor&$filter=Id eq " + id +"&$Top=1";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "Travel"});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Itinerary')/items?$select=*,BudgetManager/Title&$expand=BudgetManager&$filter=TravelId eq " + id;
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "Itinerary"});

    batchExecutor.executeAsync().done(function (result) {
        $.each(result, function (k, v) {
            let command = $.grep(commands, function (command) {
                return v.id === command.id;
            });
            if (command[0].title == "Travel") {
                getTravel(v.result.result.value);
            }
            if (command[0].title == "Itinerary") {
                getItinerary(v.result.result.value);
            }
        });
    }).fail(function (err) {
        onError(err);
    });
}

function loadBatch() {
    let commands = [];
    let batchExecutor = new RestBatchExecutor(_spPageContextInfo.webAbsoluteUrl, {'X-RequestDigest': $('#__REQUESTDIGEST').val()});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl
        + "('Travel')/items?&$select=Id,TravelPurpose,TravelAmount,Traveller/Title&$expand=Traveller&$filter=SupervisorId eq "
        + _spPageContextInfo.userId + " and Status eq 'Pending'&$orderby=Id desc";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "loadTravelSupervisor"});
    batchRequest = new BatchRequest();
    batchRequest.endpoint = lstUrl + "('Itinerary')/items?$select=TravelId&$filter=BudgetManagerId eq "
        + _spPageContextInfo.userId + " and Status eq 'Pending'";
    batchRequest.headers = {'accept': 'application/json;odata=nometadata'};
    commands.push({id: batchExecutor.loadRequest(batchRequest), title: "BMTravels"});

    batchExecutor.executeAsync().done(function (result) {
        $.each(result, function (k, v) {
            let command = $.grep(commands, function (command) {
                return v.id === command.id;
            });
            if (command[0].title == "loadTravelSupervisor") {
                let results = v.result.result.value;
                app.supervisor = (results.length > 0);
                app.loadTravels(results);
            }
            if (command[0].title == "BMTravels") {
                let results = v.result.result.value;
                app.budget_manager = true;
                getTravelIds(results);
            }
        });
    }).fail(function (err) {
        onError(err);
    });
}

function getTravelIds(d) {
    const travel_ids = d.map(j => j.TravelId);
    let filterString = "";
    travel_ids.forEach(function (j) {
        filterString += "Id eq " + j + " or "
    });
    if(filterString.length>0){
        filterString =  filterString.substring(0, filterString.length-4);
    }
    restCalls("('Travel')/items?&$select=Id,TravelPurpose,TravelAmount,Traveller/Title&$expand=Traveller&$filter="
        + filterString +"&$orderby=Id desc", "Fetch travel items failed", app.loadTravels);
}