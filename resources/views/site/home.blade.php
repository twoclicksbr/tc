<!DOCTYPE html>
<html lang="en">

@include('site.head')

<body>
    <!-- header -->
    @include('site.header')

    <!-- Columned Slider start-->
    <section class="columned-slider">

        <div class="swiper-container columned-slider-inner">

            <div class="swiper-wrapper">

                <div class="swiper-slide" style="background: url({{ asset('site/assets/img/img1.jpg') }});">

                    <div class="columned-slider-inner-content" data-fancybox="" data-src="#modal-bethel360">
                        <div class="columned-slider-overlay"></div>
                        <div class="columned-slider-detail" style="margin-bottom: 50px">
                            <h2 class="columned-heading heading-as-btn">Bethel360°</h2>
                            <h5 class="">Gestão para igrejas.</h5>
                            <p class="columned-description">
                                Membros, células, grupos e eventos em uma única plataforma.
                            </p>
                            <span class="columned-line-devider"></span>
                        </div>
                    </div>

                </div>

                <div class="swiper-slide" style="background: url({{ asset('site/assets/img/img2.jpg') }});">

                    <div class="columned-slider-inner-content" data-fancybox="" data-src="#modal-clickBank">

                        <div class="columned-slider-overlay"></div>
                        <div class="columned-slider-detail" style="margin-bottom: 50px">
                            <h2 class="columned-heading heading-as-btn">ClickBank</h2>
                            <h5 class="">O seu banco digital completo.</h5>
                            <p class="columned-description">
                                Conectado ao ecossistema TwoClicks para simplificar suas finanças.
                            </p>
                            <span class="columned-line-devider"></span>
                        </div>

                    </div>

                </div>

                <div class="swiper-slide" style="background: url({{ asset('site/assets/img/img7.jpg') }});">

                    <div class="columned-slider-inner-content" data-fancybox="" data-src="#modal-whatsPanel">

                        <div class="columned-slider-overlay"></div>
                        <div class="columned-slider-detail" style="margin-bottom: 50px">
                            <h2 class="columned-heading heading-as-btn">WhatsPanel</h2>
                            <h5 class="">Automatize o WhatsApp.</h5>
                            <p class="columned-description">
                                Centralize atendimentos e melhore sua comunicação.
                            </p>
                            <span class="columned-line-devider"></span>
                        </div>

                    </div>

                </div>

                <div class="swiper-slide" style="background: url({{ asset('site/assets/img/img4.jpg') }});">

                    <div class="columned-slider-inner-content" data-fancybox="" data-src="#modal-smartClick360">
                        <div class="columned-slider-overlay"></div>
                        <div class="columned-slider-detail" style="margin-bottom: 50px">
                            <h2 class="columned-heading heading-as-btn">SmartClick360°</h2>
                            <h5 class="">Tecnologia para sua gestão.</h5>
                            <p class="columned-description">
                                Ferramentas integradas para dar visão estratégica ao seu negócio.
                            </p>
                            <span class="columned-line-devider"></span>
                        </div>
                    </div>

                </div>

            </div>

        </div>

    </section>

    <!-- footer -->
    @include('site.footer')

    <!-- modal windows -->
    @include('site.modal')

    <!-- script -->
    @include('site.script')
</body>

</html>
