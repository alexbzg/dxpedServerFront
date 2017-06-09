var module = angular
    .module( 'dxpApp', [ 'ymaps', 'ngSanitize', 'bootstrapLightbox' ] )
    .directive('compile', compileDirective )
    .directive( 'lightboxImage', lightboxImage )
    .factory( 'DataServiceFactory', DataServiceFactory )
    .service( 'Location', Location )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .service( 'Chat', Chat )
    .service( 'Tabs', Tabs )
    .service( 'Log', Log )
    .service( 'Status', Status )
    .controller( 'newsController', newsController )
    .controller( 'spotsController', spotsController )
    .controller( 'mapController', mapController )
    .controller( 'statusController', statusController )
    .controller( 'tabsController', tabsController )
    .controller( 'checkController', checkController )
    .controller( 'logController', logController )
    .controller( 'chatController', chatController )
   ;


function compileDirective($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                // watch the 'compile' expression for changes
                return scope.$eval(attrs.compile);
            },
            function(value) {
                // when the 'compile' expression changes
                // assign it into the current DOM
                element.html(value);

                // compile the new DOM and link it to the current
                // scope.
                // NOTE: we only compile .childNodes so that
                // we don't get into infinite loop compiling ourselves
                $compile(element.contents())(scope);
            }
        );
    };
}

function lightboxImage( Lightbox ) {
    return {
        restrict: 'E',
        scope: {
            image: '@',
            thumb: '@'
        },
        controller: lightboxController,
        controllerAs: 'vm',
        templateUrl: 'lightboxImage.html',
        bindToController: true
    };

    function lightboxController() {
        var vm = this;
        vm.openLightbox = openLightbox;

        return vm;

        function openLightbox() {
            Lightbox.openModal( [{url: vm.image}], 0 );
        }
    }
}

function DataController( DataService, interval, $interval ) {
    var vm = this;
    vm.processData = function() {};
    vm.load = load;
    load();
    $interval( load, 60000 );
    
    
    function load() {
        DataService.load()
            .then( function( data ) {
                    if ( data ) {
                        vm.data = data;
                        vm.processData();
                    }
                });
    }


}

function Location( DataServiceFactory ) {
    return DataServiceFactory( "/rda/location.json" );
}

function Spots( DataServiceFactory ) {
    return DataServiceFactory( "/rda/spots.json" );
}

function Status( DataServiceFactory ) {
    return DataServiceFactory( "/rda/status.json" );
}

function Log( DataServiceFactory ) {
    var s = DataServiceFactory( "/rda/qso.json" );
    var empty = true;
    s.lastEntry = lastEntry;
    s.isEmpty = isEmpty;
    s.processData = processData;

    return s;

    function lastEntry() {
        if ( s.data && s.data.length > 0 )
            return s.data[0];
        else
            return null;
    }

    function isEmpty() {
        return empty;
    }

    function processData() {
        empty = ( s.data == null ) || ( s.data.length == 0 );
        s.data.forEach( function( item ) {
            item.freq /= 100;
        });
    }
}

function Tabs() {
    var active = 'log';
    return {
        active: function() { return active; },
        setActive: function(value) { active = value; }
    };
}

function DataServiceFactory( $http ) {
    return createDataService;

    function createDataService( url ) {
        var s = { lm: null,
            load: load,
            data: null,
            url: url,
            processData: function() {} 
        };
        return s;

        function load() {
            return $http.get( s.url )
                .then( loadComplete )
                .catch( loadFailed );
        }

        function loadComplete( response ) {
            if ( ( s.lm == null || s.lm != response.headers( 'last-modified' ) ) && 
                    response.data ) {
                s.lm = response.headers( 'last-modified' ); 
                s.data = response.data;
                s.processData();
                return s.data;
            } else
                return false;
        }

        function loadFailed( error ) {
            console.log( s.url + ' XHR failed: ' + error.data );
        }
    }
}

function News( DataServiceFactory ) {
    return DataServiceFactory(  "/rda/news.json" );
}

function Chat( DataServiceFactory, $http ) {
    var s = DataServiceFactory(  "/rda/chat.json" );
    var sendURL = "/dxped/uwsgi/chat";

    s.send = send;

    return s;

    function send( data ) {
        return $http.post( sendURL, data )
            .catch( sendFailed );
    }

    function sendFailed( error ) {
        console.log( sendURL + ' XHR failed: ' + error.data );
    }


}


function newsController( News, $interval ) {
    DataController.call( this, News, 60000, $interval );
    var vm = this;
    return vm;

}

function tabsController( Tabs ) {
    var vm = this;
    vm.active = Tabs.active;
    vm.setActive = Tabs.setActive;
    return vm;
}

function logController( Log, $interval ) {
    DataController.call( this, Log, 60000, $interval );
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    return vm;
}

function statusController( Log ) {
    var vm = this;
    vm.lastLogEntry = Log.lastEntry;
    vm.logEmpty = Log.isEmpty;
    return vm;
}


function chatController( Chat, $interval, Storage ) {
    DataController.call( this, Chat, 60000, $interval );
    var storageKey = 'dxpChatCS';
    var vm = this;

    vm.cs = Storage.load( storageKey, 'local' );
    vm.send = send;


    return vm;

    function send() {
        Storage.save( storageKey, vm.cs, 'local' );
        Chat.send( { cs: vm.cs, text: vm.text } )
            .then( sendComplete )
            .catch( sendFailed );
    }

    function sendComplete() {
        vm.text = "";
        vm.load();
    }

    function sendFailed( error ) {
        window.alert( "Sorry, there was an error. Please try again later" );
    }
   
}

function checkController( Log ) {
    var vm = this;
    vm.check = check;
    return vm;

    function check() {
        vm.cs = vm.cs.toUpperCase();
        if ( Log.data ) {
            vm.found = Log.data.filter( function( item ) {
                return item.cs == vm.cs; 
            });
            if ( vm.found.length == 0 )
                vm.found = false;
        } else
            vm.found = false;
    }

}


function spotsController( Spots, $interval ) {
    DataController.call( this, Spots, 60000, $interval );
    return this;
}

function mapController( Location, $interval ) {
    DataController.call( this, Location, 60000, $interval );
    var vm = this;
    vm.processData = processData;

    vm.map = { center: [ 45, 39 ], zoom: 11 };

    return vm;

    function processData() {
        if ( vm.data.location )
            vm.map.center = vm.data.location;
    }

}

