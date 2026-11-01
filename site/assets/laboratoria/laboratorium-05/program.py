import random

losuj = random.Random(2026)
trafienia = 0

for n in range(1, 10001):
    x = losuj.random()
    y = losuj.random()

    if x*x + y*y <= 1:
        trafienia += 1

    if n in (100, 1000, 10000):
        pi = 4 * trafienia / n
        print(n, trafienia, round(pi, 4))
