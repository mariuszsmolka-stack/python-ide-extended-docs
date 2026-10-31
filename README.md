# Python IDE Extended - materiały edukacyjne

Autor: **Mariusz Smółka**
Kontakt: **mariuszsmolka.ql@gmail.com**

Dokumentacja pomaga poznawać Pythona, Matematykę 2D, Matematykę 3D i Statystykę. Zawiera katalog 57 funkcji, 58 artykułów, ścieżki edukacyjne, interaktywne podglądy i instrukcję obsługi IDE.

## Otwórz dokumentację

https://mariuszsmolka-stack.github.io/python-ide-extended-docs/

Przycisk otwarcia aplikacji pozostaje nieaktywny do jej publicznego uruchomienia. To repozytorium zawiera dokumentację i jej podglądy. Nie zawiera aplikacji IDE, interpretera Python ani środowiska wykonywania programów.

## Budowanie

Wymagany jest Node.js 22 lub nowszy. Nie trzeba instalować pakietów.

```sh
node build.cjs
node check.cjs
```

Gotowa witryna znajduje się w `dist/`. Można ją otworzyć przez dowolny serwer plików statycznych. Wszystkie odnośniki i zasoby działają również w podkatalogu repozytorium GitHub Pages.

Źródła artykułów znajdują się w `site/pages/`. `catalog.json` przechowuje katalog i ścieżki, a `api.json` sygnatury udokumentowanego API. `site/assets/` zawiera style, skrypty i gotowe dane numeryczne podglądów. Budowanie odtwarza witrynę z tych plików i nie wymaga osobnego repozytorium IDE ani wykonywania Pythona. Zmiana parametrów w przykładzie wymaga uruchomienia go w IDE; obracanie lub przybliżanie podglądu nie wykonuje nowych obliczeń.

GitHub Actions buduje i publikuje witrynę po zmianach gałęzi `main`. Dostępne jest również ręczne uruchomienie tego samego procesu.

## Licencje

Autorskie materiały edukacyjne: **CC BY-NC-SA 4.0 International**. Autor: Mariusz Smółka. Szczegóły zakresu w [LICENSE.md](LICENSE.md) i [NOTICE.md](NOTICE.md).

Licencja materiałów nie obejmuje automatycznie kodu aplikacji ani komponentów innych autorów. Dołączony kod wyświetlania podglądów podlega odrębnym zasadom opisanym w [NOTICE.md](NOTICE.md) i [CODE-LICENSE.md](CODE-LICENSE.md).
