const app = new Vue({
    el: '#app',
    data: {
        loading: false,
        user: _spPageContextInfo.userId,
        travels: []
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
            let item = {
                "__metadata": {"type": "SP.Data.TravelListItem"},
                TravelPurpose: this.travel_purpose,
                TravelAdvance: !!this.travel_advance,
                TravelAmount: this.total_amount,
                AdvanceAmount: parseFloat(this.advance_amount.replace(',', '')),
                AdvanceComment: this.advance_comment,
                AirTicketBooking: !!this.ticket_booking,
                AirTicketBookingComment: this.ticket_booking_comment,
                AccomodationBooking: !!this.accommodation_booking,
                AccomodationBookingComment: this.accommodation_booking_comment,
                CompanyVehicle: !!this.company_vehicle,
                CompanyVehicleComment: this.company_vehicle_comment,
                TravellerId: parseInt(this.user),
                Status: 'Pending'
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
                this.itinerary.forEach(x => {
                    x.amount = this.getRateByDestination(x.to);
                    x.days = getDays(x.start, x.end);
                    amt += x.amount * x.days
                });
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