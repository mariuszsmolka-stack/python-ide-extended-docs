import math
import ms2d
import ms3d

R = 5
wysokosci = [0, 3, 4]

# Najpierw oglądamy sferę.
rysuj_3(ms3d.sfera(r=R))

okregi = []

for h in wysokosci:
    input(f"Enter - pokaż przekrój dla h = {h}")

    # Obliczamy promień przekroju.
    r = math.sqrt(R**2 - h**2)

    # Obliczamy długość okręgu.
    L = 2 * math.pi * r

    print(f"h = {h}, r = {r:g}, L = {L:.2f}")

    okrag = ms2d.okrag(r=r)
    okregi.append(okrag)

    # Wyświetlamy pojedynczy przekrój.
    rysuj_2(okrag)

input("Enter - porównaj wszystkie przekroje")

# Trzy okręgi na wspólnych osiach.
rysuj_2(*okregi)
